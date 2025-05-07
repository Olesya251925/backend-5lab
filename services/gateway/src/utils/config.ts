import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  rabbitMQUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672",
  apiVer: "api",
  statusServiceUrl: "http://status-service:3007/api/status",
  userServiceQueue: "user_queue",
  courseServiceQueue: "course_queue",
  tagServiceQueue: "tag_queue",
  lessonServiceQueue: "lesson_queue",
  commentServiceQueue: "comment_queue",
  enrollmentServiceQueue: "enrollment_queue",
};

export default config;
