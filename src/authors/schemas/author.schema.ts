import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuthorDocument = Author & Document;

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
export class Author {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  bio?: string;

  @Prop({ type: Date })
  birthDate?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const AuthorSchema = SchemaFactory.createForClass(Author);
