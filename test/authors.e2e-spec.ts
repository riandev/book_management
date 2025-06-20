import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import * as request from 'supertest';
import { AuthorsModule } from '../src/authors/authors.module';
import { Author } from '../src/authors/schemas/author.schema';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface AuthorResponse {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  birthDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

describe('Authors API (e2e)', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let authorModel: Model<Author>;

  beforeAll(async () => {
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async () => ({
              uri: uri,
            }),
            inject: [ConfigService],
          }),
          AuthorsModule,
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
        }),
      );
      app.useGlobalFilters(new HttpExceptionFilter());

      await app.init();
      mongoConnection = (await connect(uri)).connection;
      authorModel = app.get<Model<Author>>(getModelToken(Author.name));
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      }
      if (mongoConnection) {
        await mongoConnection.dropDatabase();
        await mongoConnection.close();
      }
      if (mongoMemoryServer) {
        await mongoMemoryServer.stop();
      }
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      await mongoConnection.dropDatabase();
      const collections = mongoConnection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }

      for (const key in collections) {
        const collection = collections[key];
        const count = await collection.countDocuments();
        if (count > 0) {
          throw new Error(
            `Collection ${key} still has ${count} documents after clearing`,
          );
        }
      }
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  });

  describe('/authors (POST)', () => {
    it('should create a new author', async () => {
      const createAuthorDto = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'A test author bio',
        birthDate: '1990-01-01',
      };

      const response = await request(app.getHttpServer())
        .post('/authors')
        .send(createAuthorDto)
        .expect(201);

      const responseBody = response.body as AuthorResponse;
      expect(responseBody).toHaveProperty('id');
      expect(responseBody.firstName).toBe(createAuthorDto.firstName);
      expect(responseBody.lastName).toBe(createAuthorDto.lastName);
      expect(responseBody.bio).toBe(createAuthorDto.bio);

      const authors = await authorModel.find().exec();
      expect(authors).toHaveLength(1);
      expect(authors[0].firstName).toBe(createAuthorDto.firstName);
    });

    it('should return 400 if required fields are missing', async () => {
      const invalidAuthorDto = {
        lastName: 'Doe',
        bio: 'A test author bio',
      };

      const response = await request(app.getHttpServer())
        .post('/authors')
        .send(invalidAuthorDto)
        .expect(400);

      const responseBody = response.body as { message: string | string[] };
      expect(responseBody).toHaveProperty('message');

      if (Array.isArray(responseBody.message)) {
        expect(
          responseBody.message.some((msg) => msg.includes('firstName')),
        ).toBeTruthy();
      } else {
        expect(responseBody.message).toContain('firstName');
      }

      const authors = await authorModel.find().exec();
      expect(authors).toHaveLength(0);
    });

    it('should return 400 if invalid data types are provided', async () => {
      const invalidAuthorDto = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'A test author bio',
        birthDate: 'not-a-date',
      };

      const response = await request(app.getHttpServer())
        .post('/authors')
        .send(invalidAuthorDto)
        .expect(400);

      const responseBody = response.body as { message: string | string[] };
      expect(responseBody).toHaveProperty('message');

      const authors = await authorModel.find().exec();
      expect(authors).toHaveLength(0);
    });
  });

  describe('/authors (GET)', () => {
    it('should return an empty array when no authors exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/authors')
        .expect(200);

      const responseBody = response.body as PaginatedResponse<AuthorResponse>;
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toBeInstanceOf(Array);
      expect(responseBody.data).toHaveLength(0);
      expect(responseBody.total).toBe(0);
    });

    it('should return all authors with pagination', async () => {
      await authorModel.create([
        {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'First test author',
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          bio: 'Second test author',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/authors')
        .expect(200);

      const responseBody = response.body as PaginatedResponse<AuthorResponse>;
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toBeInstanceOf(Array);
      expect(responseBody.data).toHaveLength(2);
      expect(responseBody.total).toBe(2);
      expect(responseBody.page).toBe(1);
      expect(responseBody.limit).toBe(10);
    });

    it('should filter authors by firstName', async () => {
      await authorModel.create([
        {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'First test author',
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          bio: 'Second test author',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/authors?firstName=John')
        .expect(200);

      const responseBody = response.body as PaginatedResponse<AuthorResponse>;
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toBeInstanceOf(Array);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].firstName).toBe('John');
    });
  });
});
