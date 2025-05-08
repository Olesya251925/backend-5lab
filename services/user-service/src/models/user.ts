import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  password: string;
  role: "student" | "teacher";
}

// Схема
const UserSchema = new Schema<IUser>({
  id: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher"], required: true },
});

// Удаление дублирующей модели
if (mongoose.models.User) {
  delete mongoose.models.User;
}

// Создание модели с явным указанием базы данных и коллекции
const User = mongoose.model<IUser>("User", UserSchema, "users");

export default User;
