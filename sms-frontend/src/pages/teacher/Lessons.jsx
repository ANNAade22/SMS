import SharedLessons from "../shared/Lessons";

const Lessons = ({ role = "teacher" }) => {
  return <SharedLessons role={role} />;
};

export default Lessons;
