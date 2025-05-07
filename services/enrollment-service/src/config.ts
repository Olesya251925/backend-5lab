export const config = {
  port: process.env.PORT || 3006,
  apiVer: 'api/v1',
  mongoURL: process.env.MONGODB_URI || 'mongodb://mongodb:27017/backend',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  courseServiceUrl: process.env.COURSE_SERVICE_URL || 'http://course-service:3002',
  lessonServiceUrl: process.env.LESSON_SERVICE_URL || 'http://lesson-service:3003',
  rabbitMQUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    enrollmentUpdates: 'enrollment-updates',
    courseUpdates: 'course-updates',
    lessonUpdates: 'lesson-updates'
  }
}; 