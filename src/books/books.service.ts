import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Author, AuthorDocument } from '../authors/schemas/author.schema';
import { generateISBN } from '../common/utils/isbn.utils';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book, BookDocument } from './schemas/book.schema';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(Author.name) private authorModel: Model<AuthorDocument>,
  ) {
    console.log(`Author model initialized: ${Author.name}`);
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const author = await this.authorModel.findById(createBookDto.author).exec();
    if (!author) {
      throw new BadRequestException(
        `Author with ID ${createBookDto.author} not found`,
      );
    }
    if (!createBookDto.isbn) {
      createBookDto.isbn = generateISBN();
    }

    const createdBook = new this.bookModel(createBookDto);

    return (await createdBook.save()).populate('author');
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    title?: string;
    isbn?: string;
    author?: string;
    genre?: string;
    publishedDate?: string;
  }): Promise<{ data: Book[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      title,
      isbn,
      author,
      genre,
      publishedDate,
    } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }
    if (isbn) {
      filter.isbn = { $regex: isbn, $options: 'i' };
    }
    if (author) {
      filter.author = author;
    }
    if (genre) {
      filter.genre = { $regex: genre, $options: 'i' };
    }
    if (publishedDate) {
      const dateObj = new Date(publishedDate);
      if (!isNaN(dateObj.getTime())) {
        const nextDay = new Date(dateObj);
        nextDay.setDate(nextDay.getDate() + 1);

        filter.publishedDate = {
          $gte: dateObj,
          $lt: nextDay,
        };
      }
    }

    const [data, total] = await Promise.all([
      this.bookModel
        .find(filter)
        .populate('author')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page: +page,
      limit: +limit,
    };
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.bookModel.findById(id).populate('author').exec();
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    if (updateBookDto.author) {
      const author = await this.authorModel
        .findById(updateBookDto.author)
        .exec();
      if (!author) {
        throw new BadRequestException(
          `Author with ID ${updateBookDto.author} not found`,
        );
      }
    }
    const updateData: any = { ...updateBookDto };

    const updatedBook = await this.bookModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('author')
      .exec();

    if (!updatedBook) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return updatedBook;
  }

  async remove(id: string): Promise<void> {
    const result = await this.bookModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
  }
}
