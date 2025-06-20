# Book Management System

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

## Description

The Book Management System is a RESTful API built with NestJS that allows for managing books and their authors. This system provides a comprehensive solution for creating, reading, updating, and deleting books and authors, with support for pagination, filtering, and searching.

## Features

- **Author Management**: Create, read, update, and delete authors
- **Book Management**: Create, read, update, and delete books with author relationships
- **Data Validation**: Comprehensive validation using class-validator
- **Error Handling**: Custom exception filters for consistent error responses
- **Pagination**: Support for paginated results
- **Search & Filter**: Search by title, author name, ISBN, and more
- **Auto-generation**: ISBN auto-generation when not provided
- **Testing**: Comprehensive unit and e2e tests

## Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Validation**: class-validator and class-transformer
- **Testing**: Jest and Supertest

## Why MongoDB?

MongoDB was chosen for this project for several key reasons:

1. **Schema Flexibility**: MongoDB's document-based structure allows for flexible schemas, which is beneficial for a book management system where different books might have varying attributes.

2. **Relational Data Handling**: While MongoDB is a NoSQL database, it provides excellent support for handling relational data through references, population and aggregation, which is perfect for the author-book relationship in this system.

3. **Query Performance**: MongoDB's indexing capabilities provide fast query performance for operations like searching books by title or filtering authors.

4. **Scalability**: MongoDB's horizontal scaling capabilities make it suitable for applications that might need to grow over time.

5. **JSON-Like Documents**: The BSON format used by MongoDB aligns well with the JSON structure commonly used in REST APIs, making data transformation more straightforward.

6. **Integration with NestJS**: NestJS provides excellent support for MongoDB through the @nestjs/mongoose package, making integration seamless.

## Project Structure

```
src/
├── authors/                 # Authors module
│   ├── dto/                 # Data Transfer Objects
│   ├── schemas/             # Mongoose schemas
│   ├── authors.controller.ts
│   ├── authors.module.ts
│   └── authors.service.ts
├── books/                   # Books module
│   ├── dto/                 # Data Transfer Objects
│   ├── schemas/             # Mongoose schemas
│   ├── books.controller.ts
│   ├── books.module.ts
│   └── books.service.ts
├── common/                  # Shared resources
│   ├── filters/             # Exception filters
│   └── utils/               # Utility functions
├── config/                  # Configuration
├── app.module.ts           # Main application module
└── main.ts                 # Application entry point
```

## API Endpoints

### Authors

- `POST /authors`: Create a new author
- `GET /authors`: Get a list of all authors (with pagination and search)
- `GET /authors/:id`: Get a single author by ID
- `PATCH /authors/:id`: Update an existing author
- `DELETE /authors/:id`: Delete an author

### Books

- `POST /books`: Create a new book
- `GET /books`: Get a list of all books (with pagination, search, and filtering)
- `GET /books/:id`: Get a single book by ID
- `PATCH /books/:id`: Update an existing book
- `DELETE /books/:id`: Delete a book

## Installation

```bash
# Clone the repository
$ git clone https://github.com/riandev/book_management.git

# Install dependencies
$ npm install
```

## Configuration

Rename the `.env.example` file to `.env` in the root directory or create a new `.env` file with the following variables:

```
MONGODB_URI=mongodb://localhost:27017/book_management
```

## Running the Application

```bash
# Development mode
$ npm run start

# Watch mode
$ npm run start:dev

# Production mode
$ npm run start:prod
```

## Testing

```bash
# Unit tests
$ npm run test

# End-to-end tests
$ npm run test:e2e

# Test coverage
$ npm run test:cov
```
