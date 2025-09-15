import { useState, useEffect } from "react";
import { Pie, Bar } from "react-chartjs-2";
import styled from "styled-components";
import { fetchLeaderboard, fetchStudentActivity, fetchStudentDashboard } from "../../api/apiservice";
import BarGraph from "./BarGraph"; // Import BarGraph component

const StyledWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 20px;
  padding: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 567px) {
    padding: 10px;
    gap: 15px;
  }

  .card-new {
    width: 100%;
    border-radius: 30px;
    box-shadow: 10px 10px 20px #bebebe, -10px -10px 20px #ffffff;
    padding: 15px;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .line-chart-card-new {
    background-color: #f7f7f7;
  }

  .calendar-card-new {
    background-color: #f0f8ff;
    overflow-y: auto;
    max-height: 360px;
  }

  .placeholder-card-new {
    background-color: #fffacd;
  }

  .bottom-card-new {
    background-color: rgb(197, 255, 197);
    display: flex;
    flex-direction: row;
    align-items: flex-start;

    @media (max-width: 768px) {
      flex-direction: column;
    }
  }

  .bottom-left-card-new,
  .bottom-right-card-new {
    flex: 1;
    padding: 10px;
  }

  .pie-chart-container-new {
    width: 100%;
    height: 220px;
    display: flex;
    justify-content: center;
    align-items: center;

    @media (max-width: 567px) {
      height: 180px;
    }
  }
`;

const generateCalendarData = () => {
  const months = [
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
  ];

  const calendarData = {};

  months.forEach((month, index) => {
    const daysInMonth = new Date(
      2024 + (index < 9 ? 0 : 1),
      ((index + 3) % 12) + 1,
      0
    ).getDate();
    calendarData[month] = {};
    for (let day = 1; day <= daysInMonth; day++) {
      calendarData[month][day] = {
        Scratch: Math.floor(Math.random() * 61),
        Robotics: Math.floor(Math.random() * 61),
      };
    }
  });

  return calendarData;
};

const calendarData = generateCalendarData();

const AssessmentReport = () => {
  const monthData = {
    labels: [
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
    ],
    hours: [20, 25, 15, 18, 19, 22, 23, 17, 19],
  };

  const [selectedMonth, setSelectedMonth] = useState("April");
  const [selectedDate, setSelectedDate] = useState(new Date(2024, 3, 1));
  const [activeStartDate, setActiveStartDate] = useState(new Date(2024, 3, 1));
  const [leaderboard, setLeaderboard] = useState([]);
  const [subjectData, setSubjectData] = useState([]);
  const [lessonSummary, setLessonSummary] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPage, setSelectedPage] = useState("");
  const [barChartData, setBarChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjectIdToNameMap, setSubjectIdToNameMap] = useState({});

  useEffect(() => {
    setSelectedMonth("April");
    setSelectedDate(new Date(2024, 3, 1));
    setActiveStartDate(new Date(2024, 3, 1));
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await fetchLeaderboard();
        if (response.success) {
          setLeaderboard(response.data);
        } else {
          console.error("Failed to fetch leaderboard.");
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };

    loadLeaderboard();
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("username");
    const loadStudentActivity = async () => {
      try {
        const response = await fetchStudentActivity(user); // Replace "student10" with dynamic student ID if needed
        if (response.success) {
           if (response.data?.empty) {
            setError(response.data.message); // Show "No activity found" gracefully
            setLessonSummary([]);
            setSubjectData([]);
            return;
          }
          // Map subject IDs to names in subject_summary
          const updatedSubjectSummary = response.data.subject_summary.map((subject) => ({
            ...subject,
            subject: subjectIdToNameMap[subject.subject] || subject.subject,
          }));

          // Map subject IDs to names in lesson_summary
          const updatedLessonSummary = response.data.lesson_summary.map((lesson) => ({
            ...lesson,
            subject: subjectIdToNameMap[lesson.subject] || lesson.subject,
          }));

          setSubjectData(updatedSubjectSummary);
          setLessonSummary(updatedLessonSummary);

          // Set default subject and page
          const defaultSubject = updatedLessonSummary[0]?.subject || "";
          const defaultPage = updatedLessonSummary.find(
            (lesson) => lesson.subject === defaultSubject
          )?.page_visited || "";

          setSelectedSubject(defaultSubject);
          setSelectedPage(defaultPage);

          // Set default bar chart data
          const defaultLesson = updatedLessonSummary.find(
            (lesson) => lesson.subject === defaultSubject && lesson.page_visited === defaultPage
          );
          if (defaultLesson) {
            setBarChartData({
              labels: ["Video Time", "Quiz Time", "Content Time"],
              datasets: [
                {
                  label: "Time Spent (in minutes)",
                  data: [
                    parseFloat(defaultLesson.video_time) / 60,
                    parseFloat(defaultLesson.quiz_time) / 60,
                    parseFloat(defaultLesson.content_time) / 60,
                  ],
                  backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 159, 64, 0.6)", "rgba(153, 102, 255, 0.6)"],
                  borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 159, 64, 1)", "rgba(153, 102, 255, 1)"],
                  borderWidth: 1,
                },
              ],
            });
          }
        } else {
          setError("Failed to load student activity data.");
        }
      } catch (err) {
        setError("An error occurred while fetching student activity data.");
      } finally {
        setLoading(false);
      }
    };

    loadStudentActivity();
  }, [subjectIdToNameMap]); // Dependency on subjectIdToNameMap to ensure mapping is applied

  useEffect(() => {
    const loadStudentDashboard = async () => {
      try {
        const response = await fetchStudentDashboard("student10"); // Replace "student10" with dynamic student ID if needed
        if (response.success) {
          const map = {};
          response.data.subjects.forEach((subject) => {
            map[subject.subject_id] = subject.name;
          });
          setSubjectIdToNameMap(map);
        } else {
          console.error("Failed to fetch student dashboard.");
        }
      } catch (error) {
        console.error("Error fetching student dashboard:", error);
      }
    };

    loadStudentDashboard();
  }, []);

  const handleMonthClick = (event, activeElements) => {
    if (activeElements.length > 0) {
      const selectedIndex = activeElements[0].index;
      const month = monthData.labels[selectedIndex];
      setSelectedMonth(month);
      const newDate = new Date(2024, 3 + selectedIndex, 1); // Adjust to start from April 2024
      setSelectedDate(newDate);
      setActiveStartDate(newDate);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleSubjectChange = (event) => {
    const subject = event.target.value;
    setSelectedSubject(subject);
    const firstPage = lessonSummary.find((lesson) => lesson.subject === subject)?.page_visited || "";
    setSelectedPage(firstPage);

    // Update bar chart data for the first page of the selected subject
    const selectedLesson = lessonSummary.find(
      (lesson) => lesson.subject === subject && lesson.page_visited === firstPage
    );
    if (selectedLesson) {
      setBarChartData({
        labels: ["Video Time", "Quiz Time", "Content Time"],
        datasets: [
          {
            label: "Time Spent (in minutes)",
            data: [
              parseFloat(selectedLesson.video_time) / 60,
              parseFloat(selectedLesson.quiz_time) / 60,
              parseFloat(selectedLesson.content_time) / 60,
            ],
            backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 159, 64, 0.6)", "rgba(153, 102, 255, 0.6)"],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 159, 64, 1)", "rgba(153, 102, 255, 1)"],
            borderWidth: 1,
          },
        ],
      });
    }
  };

  const handlePageChange = (event) => {
    const page = event.target.value;
    setSelectedPage(page);

    // Update bar chart data for the selected page
    const selectedLesson = lessonSummary.find(
      (lesson) => lesson.subject === selectedSubject && lesson.page_visited === page
    );
    if (selectedLesson) {
      setBarChartData({
        labels: ["Video Time", "Quiz Time", "Content Time"],
        datasets: [
          {
            label: "Time Spent (in minutes)",
            data: [
              parseFloat(selectedLesson.video_time) / 60,
              parseFloat(selectedLesson.quiz_time) / 60,
              parseFloat(selectedLesson.content_time) / 60,
            ],
            backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 159, 64, 0.6)", "rgba(153, 102, 255, 0.6)"],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 159, 64, 1)", "rgba(153, 102, 255, 1)"],
            borderWidth: 1,
          },
        ],
      });
    }
  };

  const subjectHours = calendarData[selectedMonth] || {};
  const scratchMinutes = subjectHours[selectedDate.getDate()]?.Scratch || 0;
  const roboticsMinutes = subjectHours[selectedDate.getDate()]?.Robotics || 0;

  const pieData = {
    labels: ["Scratch", "Robotics"],
    datasets: [
      {
        label: "Minutes Distribution",
        data: [scratchMinutes, roboticsMinutes],
        backgroundColor: ["rgb(0, 151, 23)", "rgb(255, 0, 0)"],
        borderColor: ["rgb(197, 255, 197)", "rgb(197, 255, 197)"],
        borderWidth: 2,
        hoverOffset: 10, // Add hoverOffset to make the slice pop out on hover
      },
    ],
  };

  const subjectPieData = {
    labels: subjectData.map((subject) => subject.subject),
    datasets: [
      {
        label: "Time Distribution (in seconds)",
        data: subjectData.map(
          (subject) =>
            parseFloat(subject.total_video_time) +
            parseFloat(subject.total_quiz_time) +
            parseFloat(subject.total_content_time)
        ),
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const subjectPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.raw} seconds`;
          },
        },
      },
    },
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <div>{error}</div>;

  // Check if no data is available
  if (!lessonSummary || lessonSummary.length === 0) {
    return <div>No course report is available.</div>;
  }

  return (
    <StyledWrapper>
      <div className="card-new line-chart-card-new">
        {/* Replace Line graph with BarGraph */}
        <BarGraph />
      </div>

      <div className="card-new calendar-card-new">
        <h4>Lesson Summary</h4>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <label htmlFor="subjectDropdown" style={{ marginRight: "10px" }}>
              Subject:
            </label>
            <select
              id="subjectDropdown"
              value={selectedSubject}
              onChange={handleSubjectChange}
              style={{ padding: "5px", borderRadius: "5px" }}
            >
              {lessonSummary
                .map((lesson) => lesson.subject)
                .filter((value, index, self) => self.indexOf(value) === index) // Unique subjects
                .map((subject, index) => (
                  <option key={index} value={subject}>
                    {subject}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="pageDropdown" style={{ marginRight: "10px" }}>
              Topic:
            </label>
            <select
              id="pageDropdown"
              value={selectedPage}
              onChange={handlePageChange}
              style={{ padding: "5px", borderRadius: "5px", width: "230px" }} // Fixed width added
              disabled={!selectedSubject} // Disable if no subject is selected
            >
              {lessonSummary
                .filter((lesson) => lesson.subject === selectedSubject)
                .map((lesson, index) => (
                  <option key={index} value={lesson.page_visited}>
                    {lesson.page_visited}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {barChartData && (
          <div style={{ height: "300px", width: "100%" }}>
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.label}: ${context.raw} minutes`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="card-new placeholder-card-new">
        <h3 style={{ padding: "10px", margin: "0" }}>Teachers Comment</h3>
        <p style={{ padding: "10px", margin: "0" }}>
          Your performance is steady, showing a good understanding of the
          basics. <br />
          While your score is average, there’s a lot of potential for
          improvement with consistent effort. <br />
          Focus on refining your skills and challenging yourself to aim
          higher—you can do it!
        </p>
      </div>

      <div className="card-new bottom-card-new">
        <div className="bottom-left-card-new">
          <h4>Time Spent on LMS</h4>
          {subjectData.map((subject, index) => (
            <p key={index}>
              <strong>{subject.subject}:</strong>{" "}
              {(parseFloat(subject.total_curriculum_time) / 60).toFixed(2)}{" "}
              minutes
            </p>
          ))}
        </div>
        <div className="bottom-right-card-new">
          <div className="pie-chart-container-new">
            <Pie data={pieData} />
          </div>
        </div>
      </div>

      <div className="card-new" style={{ marginTop: "20px" }}>
        <h3>Subject Time Spent</h3>
        <div style={{ height: "300px", width: "100%" }}>
          <Pie
            data={{
              ...subjectPieData,
              datasets: [
                {
                  ...subjectPieData.datasets[0],
                  data: subjectData.map((subject) =>
                    (parseFloat(subject.total_curriculum_time) / 60).toFixed(2)
                  ),
                },
              ],
            }}
            options={{
              ...subjectPieOptions,
              plugins: {
                ...subjectPieOptions.plugins,
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      return `${context.label}: ${context.raw} minutes`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default AssessmentReport;
