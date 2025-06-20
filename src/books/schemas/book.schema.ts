import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Author } from '../../authors/schemas/author.schema';
import { BookGenre } from '../dto/create-book.dto';

export type BookDocument = Book & Document;

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Book {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  isbn: string;

  @Prop({ type: Date })
  publishedDate?: Date;

  @Prop({ type: String, enum: Object.values(BookGenre) })
  genre?: BookGenre;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Author', required: true })
  author: Author;

  createdAt: Date;
  updatedAt: Date;
}

export const BookSchema = SchemaFactory.createForClass(Book);
