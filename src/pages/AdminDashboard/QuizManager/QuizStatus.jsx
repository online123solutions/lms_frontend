import React from "react";

export default function QuizStatus({ quiz }) {
  const now = Date.now();
  const start = quiz.start_date ? new Date(quiz.start_date).getTime() : null;
  const end = quiz.end_date ? new Date(quiz.end_date).getTime() : null;
  if (!quiz.question_count && quiz.question_count !== undefined) return <span className="qm-chip draft">No questions</span>;
  if (!start || !end) return <span className="qm-chip draft">Not scheduled</span>;
  if (now < start) return <span className="qm-chip upcoming">Upcoming</span>;
  if (now > end) return <span className="qm-chip ended">Ended</span>;
  return <span className="qm-chip live">Live</span>;
}
