import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { Author, AuthorDocument } from '../authors/schemas/author.schema';
import * as isbnUtils from '../common/utils/isbn.utils';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book, BookDocument } from './schemas/book.schema';

describe('BooksService', () => {
  let service: BooksService;
  let bookModel: Model<BookDocument>;
  let authorModel: Model<AuthorDocument>;

  const mockBookModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    prototype: {
      save: jest.fn(),
    },
  };

  const mockAuthorModel = {
    findById: jest.fn(),
  };

  const mockAuthor = {
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test Bio',
    birthDate: new Date('1990-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Author;

  const mockBook = {
    title: 'Test Book',
    isbn: '978-3-16-148410-0',
    publishedDate: new Date(),
    genre: 'Fiction',
    author: mockAuthor,
    createdAt: new Date(),
    updatedAt: new Date(),
    populate: jest.fn().mockReturnThis(),
  } as unknown as Book;

  const mockBookDto: CreateBookDto = {
    title: 'Test Book',
    isbn: '1234567890123',
    publishedDate: '2023-01-01',
    genre: 'Fiction',
    author: 'author-id',
  };

  const mockUpdateBookDto: UpdateBookDto = {
    title: 'Updated Book',
    genre: 'Non-Fiction',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getModelToken(Book.name),
          useValue: mockBookModel,
        },
        {
          provide: getModelToken(Author.name),
          useValue: mockAuthorModel,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    bookModel = module.get<Model<BookDocument>>(getModelToken(Book.name));
    authorModel = module.get<Model<AuthorDocument>>(getModelToken(Author.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new book', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValueOnce(mockBook as any);

      const result = await service.create(mockBookDto);

      expect(result).toEqual(mockBook);
      expect(service.create).toHaveBeenCalledWith(mockBookDto);
    });

    it('should auto-generate ISBN if not provided', async () => {
      const generateISBNSpy = jest
        .spyOn(isbnUtils, 'generateISBN')
        .mockReturnValue('978-1-2345-6789-0');

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockImplementation(async (createBookDto: CreateBookDto) => {
        if (!createBookDto.isbn) {
          createBookDto.isbn = isbnUtils.generateISBN();
        }
        return {
          ...mockBook,
          ...createBookDto,
          populate: jest.fn().mockReturnThis(),
        } as any;
      });

      const bookDtoWithoutIsbn: Partial<CreateBookDto> = {
        title: 'Test Book',
        author: 'author-id',
      };

      const result = await service.create(bookDtoWithoutIsbn as CreateBookDto);

      expect(result.isbn).toBeDefined();
      expect(result.isbn).toBe('978-1-2345-6789-0');
      expect(generateISBNSpy).toHaveBeenCalled();

      generateISBNSpy.mockRestore();
      createSpy.mockRestore();
      generateISBNSpy.mockRestore();
      createSpy.mockRestore();
    });

    it('should throw BadRequestException if author not found', async () => {
      jest.spyOn(service, 'create').mockRestore();

      jest.spyOn(authorModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.create(mockBookDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all books with pagination', async () => {
      const mockBooks = [mockBook];
      const mockPaginatedResult = {
        data: mockBooks,
        total: 1,
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockPaginatedResult);

      const result = await service.findAll({});

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should filter books by title, isbn, and author', async () => {
      const mockBooks = [mockBook];
      const mockPaginatedResult = {
        data: mockBooks,
        total: 1,
        page: 1,
        limit: 10,
      };

      const query = { title: 'Test', isbn: '123', author: 'author-id' };

      jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockPaginatedResult);

      const result = await service.findAll(query);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should find a book by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockBook as any);

      const result = await service.findOne('book-id');

      expect(result).toEqual(mockBook);
      expect(service.findOne).toHaveBeenCalledWith('book-id');
    });

    it('should throw NotFoundException if book not found', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValueOnce(
          new NotFoundException('Book with ID not-found-id not found'),
        );

      await expect(service.findOne('not-found-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a book', async () => {
      const updatedBook = { ...mockBook, ...mockUpdateBookDto };
      jest.spyOn(service, 'update').mockResolvedValueOnce(updatedBook as any);

      const result = await service.update('book-id', mockUpdateBookDto);

      expect(result).toEqual(updatedBook);
      expect(service.update).toHaveBeenCalledWith('book-id', mockUpdateBookDto);
    });

    it('should throw NotFoundException if book to update not found', async () => {
      jest
        .spyOn(service, 'update')
        .mockRejectedValueOnce(
          new NotFoundException('Book with ID not-found-id not found'),
        );

      await expect(
        service.update('not-found-id', mockUpdateBookDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if author not found during update', async () => {
      jest
        .spyOn(service, 'update')
        .mockRejectedValueOnce(
          new BadRequestException('Author with ID invalid-author-id not found'),
        );

      await expect(
        service.update('book-id', { author: 'invalid-author-id' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a book', async () => {
      jest.spyOn(service, 'remove').mockResolvedValueOnce(undefined);

      await service.remove('book-id');

      expect(service.remove).toHaveBeenCalledWith('book-id');
    });

    it('should throw NotFoundException if book to remove not found', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValueOnce(
          new NotFoundException('Book with ID not-found-id not found'),
        );

      await expect(service.remove('not-found-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
