import { Suspense } from "react";
import CoursesPage from "./CoursesPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CoursesPage />
    </Suspense>
  );
}