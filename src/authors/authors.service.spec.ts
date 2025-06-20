import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { Book } from '../books/schemas/book.schema';
import { AuthorsService } from './authors.service';
import { Author } from './schemas/author.schema';

const mockAuthor = {
  _id: '5f9d5c9b9d9b9d9b9d9b9d9b',
  firstName: 'Rashaduzamman',
  lastName: 'Rian',
  bio: 'Test bio',
  birthDate: new Date('1994-02-06'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthorDto = {
  firstName: 'Rashaduzamman',
  lastName: 'Rian',
  bio: 'Test bio',
  birthDate: '1994-02-06',
};

describe('AuthorsService', () => {
  let service: AuthorsService;
  let model: Model<Author>;
  const mockAuthorModel = {
    find: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    countDocuments: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    prototype: {
      save: jest.fn(),
    },
  };

  const mockBookModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        {
          provide: getModelToken(Author.name),
          useValue: mockAuthorModel,
        },
        {
          provide: getModelToken(Book.name),
          useValue: mockBookModel,
        },
      ],
    }).compile();

    service = module.get<AuthorsService>(AuthorsService);
    model = module.get<Model<Author>>(getModelToken(Author.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new author', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValueOnce(mockAuthor);

      const result = await service.create(mockAuthorDto);

      expect(result).toEqual(mockAuthor);
      expect(service.create).toHaveBeenCalledWith(mockAuthorDto);
    });
  });

  describe('findAll', () => {
    it('should return all authors with pagination', async () => {
      const authors = [mockAuthor];
      const count = 1;

      jest.spyOn(mockAuthorModel, 'find').mockReturnValueOnce({
        skip: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            exec: jest.fn().mockResolvedValueOnce(authors),
          }),
        }),
      } as any);

      jest.spyOn(mockAuthorModel, 'countDocuments').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(count),
      } as any);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: authors,
        total: count,
        page: 1,
        limit: 10,
      });
    });

    it('should filter authors by firstName and lastName', async () => {
      const authors = [mockAuthor];
      const count = 1;

      jest.spyOn(mockAuthorModel, 'find').mockReturnValueOnce({
        skip: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            exec: jest.fn().mockResolvedValueOnce(authors),
          }),
        }),
      } as any);

      jest.spyOn(mockAuthorModel, 'countDocuments').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(count),
      } as any);

      const result = await service.findAll({ firstName: 'Rashaduzamman' });

      expect(mockAuthorModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: { $regex: 'Rashaduzamman', $options: 'i' },
        }),
      );

      expect(result.data).toEqual(authors);
    });
  });

  describe('findOne', () => {
    it('should find an author by id', async () => {
      jest.spyOn(mockAuthorModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockAuthor),
      } as any);

      const result = await service.findOne('5f9d5c9b9d9b9d9b9d9b9d9b');

      expect(result).toEqual(mockAuthor);
    });

    it('should throw NotFoundException if author not found', async () => {
      jest.spyOn(mockAuthorModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.findOne('nonexistentid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an author', async () => {
      const updatedAuthor = { ...mockAuthor, bio: 'Updated bio' };

      jest.spyOn(mockAuthorModel, 'findByIdAndUpdate').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(updatedAuthor),
      } as any);

      const result = await service.update('5f9d5c9b9d9b9d9b9d9b9d9b', {
        bio: 'Updated bio',
      });

      expect(result).toEqual(updatedAuthor);
    });

    it('should throw NotFoundException if author to update not found', async () => {
      jest.spyOn(mockAuthorModel, 'findByIdAndUpdate').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(
        service.update('nonexistentid', { bio: 'Updated bio' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should remove an author', async () => {
      jest.spyOn(mockAuthorModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAuthor),
      } as any);

      jest.spyOn(mockBookModel, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as any);

      jest.spyOn(mockAuthorModel, 'findByIdAndDelete').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAuthor),
      } as any);

      await service.remove('5f9d5c9b9d9b9d9b9d9b9d9b');

      expect(mockAuthorModel.findByIdAndDelete).toHaveBeenCalledWith(
        '5f9d5c9b9d9b9d9b9d9b9d9b',
      );
    });

    it('should throw NotFoundException if author to remove not found', async () => {
      jest.spyOn(mockAuthorModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.remove('nonexistentid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if author has associated books', async () => {
      jest.spyOn(mockAuthorModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAuthor),
      } as any);
      jest.spyOn(mockBookModel, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      } as any);

      await expect(service.remove('author-with-books')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAuthorModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
