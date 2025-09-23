export interface IJoinUpskillApplication {
  id: string;
  teacherName: string;
  schoolName: string;
  teachingLevel: string;
  numberOfLearners: number;
  yearsOfExperience: number;
  email: string;
  phoneNumber: string;
  type?: string | null;
  platform?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
// represents the structure of a JoinUpskill application