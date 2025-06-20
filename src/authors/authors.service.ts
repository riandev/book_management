import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from '../books/schemas/book.schema';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { Author, AuthorDocument } from './schemas/author.schema';

@Injectable()
export class AuthorsService {
  private readonly bookType: typeof Book = Book;
  constructor(
    @InjectModel(Author.name) private authorModel: Model<AuthorDocument>,
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
  ) {}

  async create(createAuthorDto: CreateAuthorDto): Promise<Author> {
    const createdAuthor = new this.authorModel(createAuthorDto);
    return createdAuthor.save();
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    firstName?: string;
    lastName?: string;
  }): Promise<{ data: Author[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, firstName, lastName } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (firstName) {
      filter.firstName = { $regex: firstName, $options: 'i' };
    }
    if (lastName) {
      filter.lastName = { $regex: lastName, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.authorModel.find(filter).skip(skip).limit(limit).exec(),
      this.authorModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page: +page,
      limit: +limit,
    };
  }

  async findOne(id: string): Promise<Author> {
    const author = await this.authorModel.findById(id).exec();
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    return author;
  }

  async update(id: string, updateAuthorDto: UpdateAuthorDto): Promise<Author> {
    const updatedAuthor = await this.authorModel
      .findByIdAndUpdate(id, updateAuthorDto, { new: true })
      .exec();

    if (!updatedAuthor) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    return updatedAuthor;
  }

  async remove(id: string): Promise<void> {
    const author = await this.authorModel.findById(id).exec();
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    const booksCount = await this.bookModel
      .countDocuments({ author: id })
      .exec();
    if (booksCount > 0) {
      throw new BadRequestException(
        `Cannot delete author with ID ${id} because they have ${booksCount} associated books. Delete the books first or reassign them to another author.`,
      );
    }
    await this.authorModel.findByIdAndDelete(id).exec();
  }
}
