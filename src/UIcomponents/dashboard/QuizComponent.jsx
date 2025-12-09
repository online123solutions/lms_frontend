import { useState, useEffect } from "react";
import "../../utils/css/QuizComponent.css";
import AnimatedBackground from "../common/AnimatedBackground";
import QuizCard from "../common/QuizCard";
import QuestionCard from "../common/QuestionCard";
import QuizResultCard from "../common/QuizResultCard";
import { fetchTraineeDashboard } from "../../api/traineeAPIservice";
import axios from "axios";

const QuizComponent = ({ setActiveContent }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null); // { id, title, time, no_of_questions, questions: [...] }
  const [quizStarted, setQuizStarted] = useState(false);

  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResults, setShowResults] = useState(false);
    const username = localStorage.getItem("username") || "";

 useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const result = await fetchTraineeDashboard(username);
      if (result.success) {
        setData(result.data);
      } else {
        console.error("Error:", result.error);
      }
      setLoading(false);
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    if (quizStarted) {
      setTimeLeft(selectedQuiz?.time * 60);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizStarted]);

  useEffect(() => {
    if (countdown > 0 && selectedQuiz && !quizStarted) {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownInterval);
            setQuizStarted(true); // Start the quiz after countdown
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [countdown, selectedQuiz, quizStarted]);

  const handleAnswerSelect = (questionId, answerId, optionIndex) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerId }));
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = () => {
    if (!selectedQuiz) return;
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedOption(null);
    }
  };

  const handlePreviousQuestion = () => {
    if (!selectedQuiz) return;
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      const prevQ = selectedQuiz.questions[prevIndex];
      const prevSelectedId = selectedAnswers[prevQ?.id];
      setSelectedOption(
        prevSelectedId
          ? prevQ.answers.findIndex((a) => a.id === prevSelectedId)
          : null
      );
    }
  };

  const saveQuizResult = async (quizId, answersMap) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await axios.post(
        `https://lms.steel.study/quiz/${quizId}/save/`,
        answersMap,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error("❌ Error saving quiz result:", error.response?.data || error.message);
      return { success: false, error: "Failed to save quiz result." };
    }
  };

  

  // const handleSubmitQuiz = () => {
  //   setShowResults(true);
  // };

  const handleSubmitQuiz = async () => {
    setShowResults(true);
  
    const answersToSubmit = {};
    selectedQuiz.questions.forEach((question) => {
      const selectedAnswerId = selectedAnswers[question.id];
      const selectedAnswerObj = question.answers.find((a) => a.id === selectedAnswerId);
      if (selectedAnswerObj) {
        answersToSubmit[question.question] = selectedAnswerObj.answer;
      }
    });
  
    const result = await saveQuizResult(selectedQuiz.id, answersToSubmit);
  
    if (!result.success) {
      console.error("Error saving quiz result:", result.error);
    } else {
      console.log("✅ Quiz result saved:", result.data);
    }
  };
  


  const calculateResults = () => {
    let correct = 0;
    selectedQuiz.questions.forEach((question) => {
      const correctAnswer = question.answers.find((answer) => answer.correct)?.id;
      if (selectedAnswers[question.id] === correctAnswer) {
        correct += 1;
      }
    });
    return { correct, total: selectedQuiz.questions.length };
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setSelectedQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setCountdown(3); // Reset countdown
  };

  if (loading) return <p>Loading...</p>;
  if (!data || !data.quizzes?.length) return <p style={{ padding: '70px' }}>No quizzes available.</p>;

  return (
    <div className="quiz-container" style={{ paddingTop: '50px' }}>
      <AnimatedBackground /> {/* Add the animated background */}
      {!selectedQuiz ? (
        <div className="quiz-cards-container">
          {data.quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz} // Pass quiz data dynamically
              onClick={() => setSelectedQuiz(quiz)} // Handle card click
              noOfQuestions={quiz.no_of_questions} // Pass number of questions
              timeLimit={quiz.time} // Pass time limit
            />
          ))}
        </div>
      ) : !quizStarted ? (
        <div className="countdown-timer">
          <h2>Starting in {countdown}...</h2>
        </div>
      ) : showResults ? (
        <QuizResultCard
          correct={calculateResults().correct} // Pass correct answers
          total={calculateResults().total} // Pass total questions
          onBackToQuizzes={resetQuiz} // Handle "Back to Quizzes" button
          onShowReport={() => setActiveContent("assessment")} // Set activeContent to "assessment"
        />
      ) : (
        <div className="quiz-content">
          {/* Question Navigation */}
          <div className="question-navigation">
            {selectedQuiz.questions.map((_, index) => {
              const isAnswered = selectedAnswers[selectedQuiz.questions[index]?.id];
              const isCurrent = index === currentQuestionIndex;
              const circleColor = isAnswered
                ? "green"
                : isCurrent
                ? "yellow"
                : index < currentQuestionIndex
                ? "red"
                : "gray";

              return (
                <div
                  key={index}
                  className="question-circle"
                  style={{ backgroundColor: circleColor }}
                  onClick={() => {
                    setCurrentQuestionIndex(index);
                    setSelectedOption(
                      selectedAnswers[selectedQuiz.questions[index]?.id]
                        ? selectedQuiz.questions[index].answers.findIndex(
                            (a) => a.id === selectedAnswers[selectedQuiz.questions[index]?.id]
                          )
                        : null
                    ); // Restore selected option for the clicked question
                  }}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          {/* Question Card */}
          <QuestionCard
            question={selectedQuiz.questions[currentQuestionIndex].question}
            options={selectedQuiz.questions[currentQuestionIndex].answers.map((a) => a.answer)}
            questionNumber={currentQuestionIndex + 1}
            timeLeft={timeLeft}
            selectedOption={selectedOption} // Pass selected option
            onOptionSelect={(index) =>
              handleAnswerSelect(
                selectedQuiz.questions[currentQuestionIndex].id,
                selectedQuiz.questions[currentQuestionIndex].answers[index].id,
                index
              )
            }
          />

          {/* Navigation Buttons */}
          <div className="navigation-buttons">
            <button
              onClick={handlePreviousQuestion}
              className={`prev-btn ${currentQuestionIndex === 0 ? "hidden" : ""}`}
            >
              Previous
            </button>
            {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
              <button onClick={handleNextQuestion} className="next-btn">Next</button>
            ) : (
              <button onClick={handleSubmitQuiz} className="submit-btn">Submit</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
