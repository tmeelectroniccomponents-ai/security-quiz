/* =========================================================
   Email & Password Security Quiz
   ========================================================= */

(() => {
  "use strict";

  /* ---------- Constants ---------- */

  const ICON_CORRECT    = "\u2713"; // ✓
  const ICON_WRONG      = "\u2715"; // ✕
  const SCROLL_DELAY_MS = 300;
  const LABEL_CORRECT   = "Why this is correct: ";
  const LABEL_WRONG     = "Why this is incorrect: ";


  /* ---------- Helpers ---------- */

  const renderResultMessage = (element, label, body, variant) => {
    element.textContent = "";

    const heading = document.createElement("strong");
    heading.textContent = label;

    element.append(heading, document.createTextNode(body));
    element.classList.add(variant);
  };

  const markAnswer = (button, variant) => {
    button.classList.add(variant);
    const icon = button.querySelector(".answer-icon");
    if (icon) {
      icon.textContent = variant === "correct" ? ICON_CORRECT : ICON_WRONG;
    }
  };

  const revealCorrectAnswer = (answers) => {
    answers.forEach((answer) => {
      if (answer.dataset.correct === "true") {
        markAnswer(answer, "correct");
      }
    });
  };


  /* ---------- Rendering ---------- */

  const buildAnswerButton = (answer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.correct = String(answer.correct);

    const icon = document.createElement("span");
    icon.className = "answer-icon";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "answer-text";
    text.textContent = answer.text;

    button.append(icon, text);
    return button;
  };

  const buildQuestionSection = (question, index, total) => {
    const section = document.createElement("section");
    section.className = "question";
    section.dataset.question = question.id;
    section.id = `question-${index + 1}`;

    const heading = document.createElement("h2");
    heading.textContent = question.text;
    section.appendChild(heading);

    question.answers.forEach((answer) => {
      section.appendChild(buildAnswerButton(answer));
    });

    const result = document.createElement("p");
    result.className = "result-message";
    result.setAttribute("role", "status");
    result.setAttribute("aria-live", "polite");
    section.appendChild(result);

    // "Next question" anchor button (hidden until answered; not shown on last question)
    if (index < total - 1) {
      const nextLink = document.createElement("a");
      nextLink.className = "next-question";
      nextLink.href = `#question-${index + 2}`;
      nextLink.textContent = "Next question →";
      section.appendChild(nextLink);
    }

    return section;
  };

  const buildLearningAside = (learning) => {
    const aside = document.createElement("aside");
    aside.className = "learning";
    aside.id = "learning";
    aside.setAttribute("aria-label", learning.ariaLabel || "Learning summary");

    const h2 = document.createElement("h2");
    h2.textContent = learning.title;
    aside.appendChild(h2);

    if (learning.intro) {
      const intro = document.createElement("p");
      intro.innerHTML = learning.intro;
      aside.appendChild(intro);
    }

    (learning.sections || []).forEach((section) => {
      if (section.heading) {
        const h3 = document.createElement("h3");
        h3.textContent = section.heading;
        aside.appendChild(h3);
      }
      if (section.body) {
        const p = document.createElement("p");
        p.innerHTML = section.body;
        aside.appendChild(p);
      }
      if (Array.isArray(section.list) && section.list.length) {
        const ul = document.createElement("ul");
        section.list.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          ul.appendChild(li);
        });
        aside.appendChild(ul);
      }
    });

    if (learning.outro) {
      const outro = document.createElement("p");
      outro.innerHTML = learning.outro;
      aside.appendChild(outro);
    }

    return aside;
  };


  /* ---------- Quiz initialisation ---------- */

  const initQuiz = (data) => {
    const titleEl    = document.getElementById("quiz-title");
    const subtitleEl = document.getElementById("subtitle");
    const progress   = document.getElementById("progress");
    const questionsContainer = document.getElementById("questions");
    const learningContainer  = document.getElementById("learning-container");
    if (data.meta) {
      if (data.meta.title) {
        titleEl.textContent = data.meta.title;
        document.title = data.meta.title;
      }
      if (data.meta.subtitle) {
        subtitleEl.textContent = data.meta.subtitle;
      }
    }

    const questionData = data.questions || [];
    questionData.forEach((q, i) => {
      questionsContainer.appendChild(
        buildQuestionSection(q, i, questionData.length)
      );
    });

    if (data.learning) {
      learningContainer.appendChild(buildLearningAside(data.learning));
    }

    const questions      = document.querySelectorAll(".question");
    const learning       = document.getElementById("learning");
    const totalQuestions = questions.length;
    let   answeredCount  = 0;

    const updateProgress = () => {
      progress.textContent =
        `${answeredCount} of ${totalQuestions} questions answered`;
    };

    const revealLearningSection = () => {
      if (!learning) return;
      learning.classList.add("is-visible");
      setTimeout(() => {
        learning.scrollIntoView({ behavior: "smooth", block: "start" });
      }, SCROLL_DELAY_MS);
    };

    questions.forEach((question, qIndex) => {
      const answers       = question.querySelectorAll(".answer");
      const resultMessage = question.querySelector(".result-message");
      const qData         = questionData[qIndex];

      answers.forEach((answer, index) => {
        answer.addEventListener("click", () => {
          if (question.classList.contains("answered")) return;

          question.classList.add("answered");
          answeredCount++;

          answers.forEach((a) => a.classList.add("disabled"));

          const isCorrect  = answer.dataset.correct === "true";
          const lessonText =
            (qData && qData.answers[index] && qData.answers[index].lesson) || "";

          if (isCorrect) {
            markAnswer(answer, "correct");
            renderResultMessage(resultMessage, LABEL_CORRECT, lessonText, "correct");
          } else {
            markAnswer(answer, "wrong");
            renderResultMessage(resultMessage, LABEL_WRONG, lessonText, "wrong");
            revealCorrectAnswer(answers);
          }

          updateProgress();

          if (answeredCount === totalQuestions) {
            revealLearningSection();
          }
        });
      });
    });

    updateProgress();
  };


  /* ---------- Boot ---------- */

  const boot = () => {
    // Preferred: data was already inlined via data/quiz.js (works from file:// too).
    if (window.QUIZ_DATA) {
      initQuiz(window.QUIZ_DATA);
      return;
    }

    // Fallback: fetch the raw JSON file (works only over http(s)).
    if (typeof fetch === "function") {
      fetch("data/quiz.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load data/quiz.json: ${response.status}`);
          }
          return response.json();
        })
        .then(initQuiz)
        .catch((error) => {
          console.error(error);
          const progress = document.getElementById("progress");
          if (progress) {
            progress.textContent =
              "Unable to load quiz content. Please serve the page over http(s) and try again.";
          }
        });
    }
  };

  boot();
})();
