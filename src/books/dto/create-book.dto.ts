import {
  IsDateString,
  IsEnum,
  IsISBN,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum BookGenre {
  FANTASY = 'Fantasy',
  SCIENCE_FICTION = 'Science Fiction',
  THRILLER = 'Thriller',
  ROMANCE = 'Romance',
  MYSTERY = 'Mystery',
  HORROR = 'Horror',
  BIOGRAPHY = 'Biography',
  HISTORY = 'History',
  CHILDREN = 'Children',
  YOUNG_ADULT = 'Young Adult',
  COMIC = 'Comic',
  OTHER = 'Other',
}

export class CreateBookDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsOptional()
  @IsDateString()
  publishedDate?: string;

  @IsOptional()
  @IsEnum(BookGenre, {
    message:
      'Genre must be one of the following: ' +
      Object.values(BookGenre).join(', '),
  })
  genre?: BookGenre;

  @IsNotEmpty()
  @IsMongoId()
  author: string;
}
