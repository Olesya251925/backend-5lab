export interface Comment {
  id: string;
  lessonId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentDto {
  lessonId: string;
  userId: string;
  content: string;
}

export interface UpdateCommentDto {
  content: string;
} 