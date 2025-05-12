# Authentication with Express and MongoDB

Welcome to the project based on **Node.js**, **Express**, and **MongoDB**! This application provides user authentication functionality with different roles: **student** and **teacher**.

## Project Description

This application organizes the project structure and includes the following features:

- **User Registration**: Users can register by providing the following fields:

  - First Name
  - Last Name
  - Username
  - Password

- **Authorization**: Users can log in using their username and password, allowing them to receive a token for access to protected routes.

- **Get User Information**: Users can request their data, including their first name, last name, and username.

- **Delete User**: A function for permanently deleting the user from the database is implemented.

## Technologies

- **Node.js**: For server-side development.
- **Express**: For creating the API.
- **MongoDB**: For storing user data.
- **Mongoose**: For working with MongoDB.
- **JWT**: For secure authentication.

## API Methods

1. **Registration** (POST)  
   `http://localhost:3000/api/auth/register`  
   Register a new user by providing first name, last name, username, and password.

2. **Login** (POST)  
   `http://localhost:3000/api/auth/login`  
   Authenticate by using your username and password.

3. **Get User Information** (GET)  
   `http://localhost:3000/api/auth/me?login=your_username`  
   Retrieve information about your account.

4. **Delete User** (DELETE)  
   `http://localhost:3000/api/auth/delete`  
   Permanently delete your account from the database.

# CHAPTER 2 - COURSES

## Course Management

This chapter extends the project by adding course management functionality. Users can create, view, update, and delete courses with various attributes.

### Course Model

Each course includes the following fields:

- **title** (required)
- **slug** (required)
- **description** (optional)
- **price** (required)
- **image** (required)
- **category** (required)
- **level** (default: beginner, required)
- **published** (default: false, indicates if the course is published)
- **author** (required)
- **createdAt** (required)

### API Methods

1. **Create a New Course** - `POST`  
   `http://localhost:3000/api/courses`

2. **Get All Courses** - `GET`
   `http://localhost:3000/api/courses`

3. **Get Course by ID** - `GET`
   `http://localhost:3000/api/courses/{id}`

Replace `{id}` with the actual course ID.

4. **Update Course by ID** - `PUT`  
   `http://localhost:3000/api/courses/{id}`

5. **Delete Course by ID** - `DELETE`  
   `http://localhost:3000/api/courses/{id}`

6. **Get Courses with Sorting** - `GET`  
   Sorting by creation date (ascending):  
    `http://localhost:3000/api/courses?sortBy=createdAt&sortOrder=asc`

Sorting by creation date (descending):  
 `http://localhost:3000/api/courses?sortBy=createdAt&sortOrder=desc`

The `sortOrder` parameter determines the sorting order:

- `asc` for ascending
- `desc` for descending

7. **Get Courses with Pagination** - `GET`  
   `http://localhost:3000/api/courses?page=1&limit=2`

8. **Get Courses by Category (Filtering)** - `GET`  
   `http://localhost:3000/api/courses?category=your_category`

9. **Search Courses by Title** - `GET`  
   `http://localhost:3000/api/courses?search=title`

### Favorite Courses

Users can add courses to their favorites. The `favorite` field is used, where `true` means the course is favorited, and `false` means it is not.

10. **Add Course to Favorites** - `POST`  
    `http://localhost:3000/api/courses/favorite/{id_course}`

11. **Remove Course from Favorites** - `DELETE`  
    `http://localhost:3000/api/courses/favorite/{id_course}`

### Course Tags System

Each course can have multiple tags (one-to-many relationship).

12. **Add a Tag** - `POST`  
    `http://localhost:3000/api/tags`

13. **View All Tags** - `GET`  
    `http://localhost:3000/api/tags`

14. **Get Tags for a Specific Course** - `GET`  
    `http://localhost:3000/api/courses/{id}/tags`

This request returns the course along with detailed tag information, including tag names.

# CHAPTER 3 - LESSONS AND COMMENTS

## Lesson Management

### Lesson Model

**Fields:**

- **title** (required) - Lesson title
- **content** (optional) - Text content
- **videoUrl** (optional) - Video link
- **course** (required) - Course reference
- **order** (optional) - Lesson order
- **createdAt** - Creation date

### API Endpoints

1. **Create Lesson**  
   `POST http://localhost:3000/api/lessons`

2. **Get All Lessons**  
   `GET http://localhost:3000/api/lessons`

3. **Get Lesson by ID**  
   `GET http://localhost:3000/api/lessons/:id`

4. **Update Lesson**  
   `PUT http://localhost:3000/api/lessons/:id`

5. **Delete Lesson**  
   `DELETE http://localhost:3000/api/lessons/:id`

---

## Comment System

**Comment Model:**

- **user** (required) - User reference
- **lesson** (required) - Lesson reference
- **text** (required) - Comment text (≤255 chars)

### API Endpoints

1. **Create Comment**  
   `POST http://localhost:3000/api/comments`

2. **Get Comments by Lesson**  
   `GET http://localhost:3000/api/comments/:lesson_id`

3. **Update Comment**  
   `PUT http://localhost:3000/api/comments/:id`

4. **Delete Comment**  
   `DELETE http://localhost:3000/api/comments/:id`

# CHAPTER 4 - COURSE ENROLLMENT AND LESSON PROGRESS

## Enrollment and Progress Management

This chapter adds functionality for enrolling users in courses, tracking lesson completion, calculating progress, and managing enrollments.

### Enroll in a Course

To enroll a user in a course:

**POST**  
`http://localhost:3000/api/enrollments/enroll/:courseId`

Replace `:courseId` with the actual course ID.

---

### Complete a Lesson

To mark a lesson as completed by a user:

**POST**  
`http://localhost:3000/api/enrollments/complete/:courseId/:lessonId`

Replace `:courseId` and `:lessonId` with the actual IDs.

---

### Track Course Progress

You can calculate how far along a user is in a course by comparing the number of completed lessons to the total lessons in that course.

**GET**  
`http://localhost:3000/api/enrollments/progress/:courseId`

This returns the user's progress for a specific course as a percentage.

---

### Cancel Completion of a Lesson

To remove a lesson from the list of completed lessons for a user:

**DELETE**  
`http://localhost:3000/api/enrollments/cancel/:courseId/:lessonId`

---

### Count Enrolled Students

To find out how many students are enrolled in a particular course:

**GET**  
`http://localhost:3000/api/enrollments/count/:courseId`

This returns the total number of users enrolled in the course.

The request should include the `userId` (the ID of the user) to check enrollment information specific to that user.

To run the project, you need to install the necessary dependencies and start the project with the command `docker-compose up --build`.
