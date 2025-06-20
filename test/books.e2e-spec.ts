import { INestApplication, ValidationPipe } from '@nestjs/common';
// Type imports for HTTP server
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import * as supertest from 'supertest';
import { AuthorsModule } from '../src/authors/authors.module';
import { Author } from '../src/authors/schemas/author.schema';
import { BooksModule } from '../src/books/books.module';
import { BookGenre } from '../src/books/dto/create-book.dto';
import { Book } from '../src/books/schemas/book.schema';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// Type-safe helper for HTTP server access
// This avoids the 'unsafe argument' TypeScript warnings while maintaining type safety
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const getHttpServer = (app: INestApplication) => app.getHttpServer();
const request = supertest;

interface BookResponse {
  id: string;
  title: string;
  isbn: string;
  author: AuthorResponse;
  createdAt: string;
  updatedAt: string;
}

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

describe('Books API (e2e)', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let bookModel: Model<Book>;
  let authorModel: Model<Author>;
  let authorId: string;

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
            useFactory: () => ({
              uri: uri,
            }),
            inject: [ConfigService],
          }),
          AuthorsModule,
          BooksModule,
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

      bookModel = app.get<Model<Book>>(getModelToken(Book.name));
      authorModel = app.get<Model<Author>>(getModelToken(Author.name));
    } catch (error) {
      console.error(
        'Error in test setup:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  });

  describe('/authors/:id (DELETE)', () => {
    it('should not allow deletion of an author with books', async () => {
      const createBookDto = {
        title: 'Book for Author Deletion Test',
        genre: BookGenre.MYSTERY,
        author: authorId,
      };

      await request(getHttpServer(app))
        .post('/books')
        .send(createBookDto)
        .expect(201);

      const response = await request(getHttpServer(app))
        .delete(`/authors/${authorId}`)
        .expect(400);

      const responseBody = response.body as { message: string };
      expect(responseBody.message).toContain('Cannot delete author');
      expect(responseBody.message).toContain('associated books');

      const author = await authorModel.findById(authorId).exec();
      expect(author).toBeTruthy();
    });

    it('should allow deletion of an author with no books', async () => {
      const createAuthorResponse = await request(getHttpServer(app))
        .post('/authors')
        .send({
          firstName: 'Author',
          lastName: 'ToDelete',
          bio: 'Will be deleted',
        })
        .expect(201);

      const authorToDeleteId = (createAuthorResponse.body as { id: string }).id;
      await request(getHttpServer(app))
        .delete(`/authors/${authorToDeleteId}`)
        .expect(204);
      const author = await authorModel.findById(authorToDeleteId).exec();
      expect(author).toBeNull();
    });
  });

  afterAll(async () => {
    try {
      // Close app first to terminate any open connections
      if (app) {
        await app.close();
      }

      // Close Mongoose connection
      if (mongoConnection) {
        await mongoConnection.dropDatabase();
        await mongoConnection.close(true); // Force close
      }

      // Stop MongoDB memory server
      if (mongoMemoryServer) {
        await mongoMemoryServer.stop({ doCleanup: true });
      }

      // Close any remaining Mongoose connections
      // Import mongoose at the top of the file instead of using require
      // This is just a safety measure to ensure all connections are closed
      const mongoose = await import('mongoose');
      await Promise.all(
        Object.values(mongoose.connections).map((connection) => {
          return connection.close();
        }),
      );
    } catch (error) {
      console.error(
        'Error in test cleanup:',
        error instanceof Error ? error.message : String(error),
      );
    }
  });

  beforeEach(async () => {
    try {
      await mongoConnection.dropDatabase();
      const collections = mongoConnection.collections;
      for (const key in collections) {
        const collection = collections[key];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await collection.deleteMany({});
      }

      const createAuthorResponse = await request(getHttpServer(app))
        .post('/authors')
        .send({
          firstName: 'Test',
          lastName: 'Author',
          bio: 'Author for testing books',
        });

      authorId = (createAuthorResponse.body as { id: string }).id;
    } catch (error) {
      console.error(
        'Error clearing database:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  });

  describe('/books (POST)', () => {
    it('should create a new book with provided ISBN', async () => {
      const createBookDto = {
        title: 'Test Book',
        isbn: '978-3-16-148410-0',
        genre: BookGenre.FANTASY,
        author: authorId,
      };

      const response = await request(getHttpServer(app))
        .post('/books')
        .send(createBookDto)
        .expect(201);

      const responseBody = response.body as BookResponse;
      expect(responseBody).toHaveProperty('id');
      expect(responseBody.title).toBe(createBookDto.title);
      expect(responseBody.isbn).toBe(createBookDto.isbn);
      expect(responseBody.author).toHaveProperty('id', authorId);
      const books = await bookModel.find().exec();
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe(createBookDto.title);
    });

    it('should auto-generate ISBN if not provided', async () => {
      const createBookDto = {
        title: 'Book Without ISBN',
        author: authorId,
      };

      const response = await request(getHttpServer(app))
        .post('/books')
        .send(createBookDto)
        .expect(201);

      const responseBody = response.body as BookResponse;
      expect(responseBody).toHaveProperty('id');
      expect(responseBody.title).toBe(createBookDto.title);
      expect(responseBody.isbn).toBeDefined();
      expect(responseBody.isbn).toMatch(/^978-\d-\d{4}-\d{4}-\d$/);
      expect(responseBody.author).toHaveProperty('id', authorId);
      const books = await bookModel.find().exec();
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe(createBookDto.title);
      expect(books[0].isbn).toBeDefined();
    });

    it('should return 400 if author ID is invalid', async () => {
      const createBookDto = {
        title: 'Test Book',
        isbn: '978-3-16-148410-0',
        author: 'invalid-author-id',
      };

      await request(getHttpServer(app))
        .post('/books')
        .send(createBookDto)
        .expect(400);
      const books = await bookModel.find().exec();
      expect(books).toHaveLength(0);
    });

    it('should return 400 if provided ISBN is invalid', async () => {
      const createBookDto = {
        title: 'Test Book',
        genre: BookGenre.FANTASY,
        isbn: 'invalid-isbn',
        author: authorId,
      };

      await request(getHttpServer(app))
        .post('/books')
        .send(createBookDto)
        .expect(400);
      const books = await bookModel.find().exec();
      expect(books).toHaveLength(0);
    });

    it('should return 400 if genre is invalid', async () => {
      const createBookDto = {
        title: 'Test Book with Invalid Genre',
        isbn: '978-3-16-148410-0',
        genre: 'InvalidGenre',
        author: authorId,
      };

      const response = await request(getHttpServer(app))
        .post('/books')
        .send(createBookDto)
        .expect(400);
      const responseBody = response.body as { message: string | string[] };
      const errorMessages = Array.isArray(responseBody.message)
        ? responseBody.message
        : [responseBody.message];
      const hasExpectedError = errorMessages.some((msg: string) =>
        msg.includes('Genre must be one of the following'),
      );
      expect(hasExpectedError).toBe(true);
      const books = await bookModel.find().exec();
      expect(books).toHaveLength(0);
    });
  });

  describe('/books (GET)', () => {
    beforeEach(async () => {
      await bookModel.create([
        {
          title: 'First Test Book',
          isbn: '978-1-4028-9462-6',
          author: authorId,
        },
        {
          title: 'Second Test Book',
          isbn: '978-0-7475-3269-9',
          author: authorId,
        },
      ]);
    });

    it('should return all books with pagination', async () => {
      const response = await request(getHttpServer(app))
        .get('/books')
        .expect(200);

      const responseBody = response.body as PaginatedResponse<BookResponse>;
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toBeInstanceOf(Array);
      expect(responseBody.data).toHaveLength(2);
      expect(responseBody.total).toBe(2);
      expect(responseBody.page).toBe(1);
      expect(responseBody.limit).toBe(10);
    });

    it('should filter books by title', async () => {
      const response = await request(getHttpServer(app))
        .get('/books?title=First')
        .expect(200);

      const responseBody = response.body as PaginatedResponse<BookResponse>;
      expect(responseBody).toHaveProperty('data');
      expect(responseBody.data).toBeInstanceOf(Array);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].title).toBe('First Test Book');
    });

    it('should filter books by ISBN', async () => {
      const response = await request(getHttpServer(app))
        .get('/books?isbn=978-0-7475-3269-9')
        .expect(200);

      const responseBody = response.body as PaginatedResponse<BookResponse>;
      const { data: books } = responseBody;
      expect(books).toBeInstanceOf(Array);
      expect(books.length).toBe(1);
      expect(books[0].isbn).toBe('978-0-7475-3269-9');
    });
  });
});
