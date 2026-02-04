import UserCard from "../components/UserCard";

const CardExamples = () => {
  const exampleStats = [
    {
      title: "Students",
      value: "1,234",
      icon: "/students.svg",
      color: "bg-blue-500",
    },
    {
      title: "Teachers",
      value: "89",
      icon: "/teachers.svg",
      color: "bg-green-500",
    },
    {
      title: "Classes",
      value: "45",
      icon: "/classes.svg",
      color: "bg-purple-500",
    },
    {
      title: "Assignments",
      value: "23",
      icon: "/assignments.svg",
      color: "bg-orange-500",
    },
  ];

  const emojiStats = [
    { title: "Students", value: "1,234", icon: "👨‍🎓", color: "bg-blue-500" },
    { title: "Teachers", value: "89", icon: "👨‍🏫", color: "bg-green-500" },
    { title: "Classes", value: "45", icon: "🏫", color: "bg-purple-500" },
    { title: "Assignments", value: "23", icon: "📋", color: "bg-orange-500" },
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        UserCard Component Examples
      </h1>

      {/* Default Variant (Original Style) */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Default Variant
        </h2>
        <div className="flex gap-4">
          <UserCard
            title="Gender"
            value="1,234"
            year="2024/25"
            customIcon="/more.png"
          />
          <UserCard
            title="Department"
            value="567"
            year="2024/25"
            customIcon="/more.png"
          />
        </div>
      </section>

      {/* Stats Variant */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Stats Variant with SVG Icons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {exampleStats.map((stat, index) => (
            <UserCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              variant="stats"
              showYear={false}
            />
          ))}
        </div>
      </section>

      {/* Emoji Stats Variant */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Stats Variant with Emoji Icons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {emojiStats.map((stat, index) => (
            <UserCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              variant="stats"
              showYear={false}
            />
          ))}
        </div>
      </section>

      {/* Compact Variant */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Compact Variant
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exampleStats.slice(0, 4).map((stat, index) => (
            <UserCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              variant="compact"
              showYear={false}
            />
          ))}
        </div>
      </section>

      {/* Gradient Variant */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Gradient Variant
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UserCard
            title="Total Students"
            value="1,234"
            bgColor="bg-blue-50"
            textColor="text-blue-600"
            subtitleColor="text-blue-800"
            variant="gradient"
            showYear={false}
          />
          <UserCard
            title="Present Today"
            value="1,180"
            bgColor="bg-green-50"
            textColor="text-green-600"
            subtitleColor="text-green-800"
            variant="gradient"
            showYear={false}
          />
          <UserCard
            title="Absent Today"
            value="54"
            bgColor="bg-red-50"
            textColor="text-red-600"
            subtitleColor="text-red-800"
            variant="gradient"
            showYear={false}
          />
          <UserCard
            title="Late Today"
            value="12"
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
            subtitleColor="text-yellow-800"
            variant="gradient"
            showYear={false}
          />
        </div>
      </section>

      {/* Interactive Cards */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Interactive Cards (with onClick)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UserCard
            title="View Students"
            value="1,234"
            icon="👨‍🎓"
            color="bg-blue-500"
            variant="stats"
            showYear={false}
            onClick={() => alert("Navigate to Students page")}
            className="cursor-pointer"
          />
          <UserCard
            title="View Teachers"
            value="89"
            icon="👨‍🏫"
            color="bg-green-500"
            variant="stats"
            showYear={false}
            onClick={() => alert("Navigate to Teachers page")}
            className="cursor-pointer"
          />
          <UserCard
            title="View Classes"
            value="45"
            icon="🏫"
            color="bg-purple-500"
            variant="stats"
            showYear={false}
            onClick={() => alert("Navigate to Classes page")}
            className="cursor-pointer"
          />
        </div>
      </section>
    </div>
  );
};

export default CardExamples;
