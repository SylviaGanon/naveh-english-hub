/* The list of everything on the site.
   START A NEW WEEK: change the number after currentWeek to the new week (for example 4). That week then shows up first
   and the daily-review button opens it. Weeks above currentWeek stay hidden.
   ADD A NEW PAGE: copy a template, then add one line below. Quizzes need a week number. Topics have n = their place in the order. */
window.NAVE_REGISTRY = {
  currentWeek: 3,
  quizzes: [
    { week: 1, title: 'שבוע 1', sub: 'Meet Emma', href: 'quizzes/meet-emma.html' },
    { week: 2, title: 'שבוע 2', sub: 'CVC', href: 'quizzes/week2-cvc.html' },
    { week: 3, title: 'שבוע 3', sub: 'CVC', href: 'quizzes/week3-cvc.html' },
    { week: 4, title: 'שבוע 4', sub: 'CVC', href: 'quizzes/week4-cvc.html' },
    { week: 5, title: 'שבוע 5', sub: 'CVC', href: 'quizzes/week5-cvc.html' },
    { week: 6, title: 'שבוע 6', sub: 'CVC', href: 'quizzes/week6-cvc.html' },
    { week: 7, title: 'שבוע 7', sub: 'CVC', href: 'quizzes/week7-cvc.html' },
    { week: 8, title: 'שבוע 8', sub: 'CVC', href: 'quizzes/week8-cvc.html' },
    { week: 9, title: 'שבוע 9', sub: 'CVC', href: 'quizzes/week9-cvc.html' },
  ],
  topics: [
    { n: 1, title: 'אותיות ה-ABC', sub: 'ABC', href: 'topics/abc-app.html' },
    { n: 2, title: 'p מול q', sub: 'p q', href: 'topics/p-vs-q.html' },
    { n: 3, title: 'כינויי גוף', sub: 'I You He She', href: 'topics/pronouns.html' },
    { n: 4, title: 'תנועות קצרות', sub: 'A E I O U', href: 'topics/vowels.html' },
    { n: 5, title: 'תרגול תנועות', sub: 'CVC', href: 'topics/vowels-practice.html' },
    { n: 6, title: 'תרגול תנועות 2', sub: 'CVC', href: 'topics/vowels-practice-2.html' },
    { n: 7, title: 'מילות ראייה', sub: 'the is on a I', href: 'topics/sight-words.html' },
    { n: 8, title: 'שתי אותיות', sub: 'sh ch th ck ng', href: 'topics/two-letters-1.html' },
    { n: 9, title: 'שתי אותיות', sub: 'wh ph qu nk', href: 'topics/two-letters-2.html' },
    { n: 10, title: 'מילות ראייה (המשך)', sub: 'in has it and he she', href: 'topics/sight-words-2.html' },
    { n: 11, title: 'שתי אותיות', sub: 'kn wr mb gn', href: 'topics/two-letters-3.html' },
    { n: 12, title: 'שתי אותיות', sub: 'll ss ff zz tch', href: 'topics/two-letters-4.html' },
    { n: 13, title: 'זוגות תנועות', sub: 'ai ay ee ea oa ow', href: 'topics/two-letters-5.html' },
    { n: 14, title: 'זוגות תנועות', sub: 'oo ou ow oi oy', href: 'topics/two-letters-6.html' },
    { n: 15, title: 'זוגות תנועות', sub: 'au aw ie igh ar or', href: 'topics/two-letters-7.html' },
    { n: 16, title: 'זוגות תנועות', sub: 'er ir ur', href: 'topics/two-letters-8.html' },
  ]
};
