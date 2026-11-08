# Nave English Hub

Interactive English lessons and weekly tests.

## Folders

- `index.html` - home page
- `topics/` - teaching lessons (letters, vowels, new sounds)
- `quizzes/` - weekly school tests, each with a printable paper test
- `assets/` - shared style (`nave.css`), shared engine (`nave.js`) and the list of all pages (`registry.js`)
- `templates/` - copy these to start a new page

## Add a new weekly test

1. Copy `templates/new-quiz.html` into `quizzes/` and rename it, for example `week3-cvc.html`.
2. Change the title and the word list inside it.
3. Add one line at the top of the `quizzes` list in `assets/registry.js`.

## Add a new teaching topic

1. Copy `templates/new-topic.html` into `topics/` and rename it.
2. Change the title and the word list.
3. Add one line in the `topics` list in `assets/registry.js`.
