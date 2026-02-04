import { CalendarDays, Clock, BookOpen } from "lucide-react";

// entries: [{ day: "Mon", time: "09:00 - 09:45", subject: "Math", room: "101", meta?: string }]
const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TimetableCard = ({ title = "This Week's Timetable", entries = [] }) => {
  // Debug logging
  console.log("TimetableCard Debug:", {
    title,
    entries,
    entriesLength: entries.length,
  });

  const byDay = daysOrder.map((d) => ({
    day: d,
    items: entries
      .filter((e) => e.day === d)
      .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
  }));

  console.log("TimetableCard byDay:", byDay);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <CalendarDays className="w-8 h-8 mr-3" />
              {title}
            </h2>
            <p className="text-indigo-100 mt-1">Your week at a glance</p>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-3xl font-bold">{entries.length}</div>
            <div className="text-sm text-indigo-200">Classes this week</div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {byDay.map(({ day, items }) => {
            const dayColors = {
              Mon: "from-blue-500 to-blue-600",
              Tue: "from-emerald-500 to-emerald-600",
              Wed: "from-amber-500 to-amber-600",
              Thu: "from-purple-500 to-purple-600",
              Fri: "from-pink-500 to-pink-600",
            };

            return (
              <div key={day} className="space-y-3">
                <div
                  className={`bg-gradient-to-r ${dayColors[day]} text-white p-3 rounded-lg text-center`}
                >
                  <div className="font-bold text-base sm:text-lg">{day}</div>
                  <div className="text-xs opacity-90">
                    {items.length} {items.length === 1 ? "class" : "classes"}
                  </div>
                </div>

                <div className="space-y-2 min-h-[150px] sm:min-h-[200px]">
                  {items.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CalendarDays className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">Free day</p>
                    </div>
                  ) : (
                    items.map((it, idx) => (
                      <div
                        key={`${day}-${idx}`}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm sm:text-base">
                              {it.subject}
                            </h4>
                            <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {it.time}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs sm:text-sm text-gray-500">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></div>
                            <span className="truncate">{it.room}</span>
                          </div>
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0 ml-2">
                            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                          </div>
                        </div>

                        {it.meta && (
                          <div className="mt-2 text-xs text-gray-500 italic">
                            {it.meta}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Summary Footer */}
      {entries.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <BookOpen className="w-4 h-4 mr-2" />
              <span>Weekly Overview</span>
            </div>
            <div className="flex items-center space-x-4 text-gray-600">
              <span>{entries.length} total classes</span>
              <span>•</span>
              <span>
                {new Set(entries.map((e) => e.subject)).size} subjects
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableCard;
