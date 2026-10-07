import { useState, useEffect } from "react";
import "../../utils/css/QuizComponent.css";
import AnimatedBackground from "../common/AnimatedBackground";
import QuizCard from "../common/QuizCard";
import QuestionCard from "../common/QuestionCard";
import QuizResultCard from "../common/QuizResultCard";
import { fetchTraineeDashboard } from "../../api/traineeAPIservice";
import { API_BASE } from "../../api/config";
import axios from "axios";

const QuizComponent = ({ setActiveContent }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null); // { id, title, time, no_of_questions, questions: [...] }
  const [quizStarted, setQuizStarted] = useState(false);

  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // questionId -> answerId or "custom"
  const [customAnswers, setCustomAnswers] = useState({}); // questionId -> typed answer
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

  const handleCustomAnswerChange = (questionId, text) => {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: text }));
    // Typing always selects the written answer (needed for questions with no options)
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: "custom" }));
    setSelectedOption("custom");
  };

  const isAnswered = (question) => {
    const selected = selectedAnswers[question?.id];
    if (selected === "custom") return Boolean(customAnswers[question.id]?.trim());
    return Boolean(selected);
  };

  // Option to highlight for a question: its index, "custom", or null
  const selectedOptionFor = (question) => {
    const selected = selectedAnswers[question?.id];
    if (!selected) return null;
    if (selected === "custom") return "custom";
    return question.answers.findIndex((a) => a.id === selected);
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setSelectedOption(selectedOptionFor(selectedQuiz.questions[index]));
  };

  const handleNextQuestion = () => {
    if (!selectedQuiz) return;
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (!selectedQuiz) return;
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const saveQuizResult = async (quizId, answersMap) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await axios.post(
        `${API_BASE}/quiz/${quizId}/save/`,
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
  
    // Submit by id so image-only questions (no text) are graded correctly
    const answersToSubmit = {
      answers: selectedQuiz.questions
        .filter((question) => isAnswered(question))
        .map((question) =>
          selectedAnswers[question.id] === "custom"
            ? { question_id: question.id, custom_answer: customAnswers[question.id].trim() }
            : { question_id: question.id, answer_id: selectedAnswers[question.id] }
        ),
    };
  
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
      const correctAnswer = question.answers.find((answer) => answer.correct);
      if (selectedAnswers[question.id] === "custom") {
        // Same rule as the backend: typed text must match the expected answer or the correct option's text
        const normalize = (t) => (t || "").replace(/\s+/g, " ").trim().toLowerCase();
        const typed = normalize(customAnswers[question.id]);
        const accepted = [question.expected_answer, correctAnswer?.answer].filter(Boolean).map(normalize);
        if (typed && accepted.includes(typed)) {
          correct += 1;
        }
      } else if (correctAnswer && selectedAnswers[question.id] === correctAnswer.id) {
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
    setCustomAnswers({});
    setSelectedOption(null);
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
              const answered = isAnswered(selectedQuiz.questions[index]);
              const isCurrent = index === currentQuestionIndex;
              const circleColor = answered
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
                  onClick={() => goToQuestion(index)} // Restores the selected option too
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          {/* Question Card */}
          <QuestionCard
            question={selectedQuiz.questions[currentQuestionIndex].question}
            questionImage={selectedQuiz.questions[currentQuestionIndex].question_image}
            options={selectedQuiz.questions[currentQuestionIndex].answers.map((a) => a.answer)}
            optionImages={selectedQuiz.questions[currentQuestionIndex].answers.map((a) => a.answer_image)}
            questionNumber={currentQuestionIndex + 1}
            timeLeft={timeLeft}
            selectedOption={selectedOption} // Pass selected option
            onOptionSelect={(index) =>
              handleAnswerSelect(
                selectedQuiz.questions[currentQuestionIndex].id,
                index === "custom" ? "custom" : selectedQuiz.questions[currentQuestionIndex].answers[index].id,
                index
              )
            }
            allowCustomAnswer={selectedQuiz.questions[currentQuestionIndex].allow_custom_answer}
            customAnswer={customAnswers[selectedQuiz.questions[currentQuestionIndex].id] || ""}
            onCustomAnswerChange={(text) =>
              handleCustomAnswerChange(selectedQuiz.questions[currentQuestionIndex].id, text)
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
