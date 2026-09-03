<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0181 Dialect Extensions

L0181 authors **flashcard study decks**. A program compiles to a deck of two-sided cards that
a learner flips and rates, one at a time.

## Writing a program

One rule covers the whole surface. There is no per-word syntax to memorize.

**Every word takes a value and the rest of the program**, and contributes one field. So the
whole program is a single chain that ends in a record literal — `{}` when there is nothing
more to configure. `cards` carries the deck and starts the chain:

```
cards [["hola" "hello"] ["adiós" "goodbye"]] title "Spanish Vocab" {}..
```

- The attribute words may appear in any order after the deck.
- Lists are space-separated (`[1 2 3]`, not `[1, 2, 3]`).
- Every program ends with `..`.
- Never drop the trailing `{}` — it is the record the chain merges into.

## L0181 Functions

| Function | Signature | Description |
| :------- | :-------- | :---------- |
| `cards` | `<list record: record>` | The deck: a list of `["front" "back"]` pairs, then its configuration |
| `title` | `<string record: record>` | The deck's title |
| `instructions` | `<string record: record>` | Guidance shown above the deck |
| `theme` | `<tag record: record>` | The UI theme — the tag `DARK` or `LIGHT` |

## Guidelines

- Each card is a two-element list, `["front" "back"]`. The front is the prompt the learner
  sees first; the back is what flipping reveals. Put the term on the front and the definition
  on the back, not the other way round.
- Both sides must be strings. A deck needs at least one card.
- Wrap math in `$…$` — `["$x^2$" "x squared"]`. Text outside the delimiters stays prose, so
  do not wrap ordinary words in `\text{}`.
- A side that is a URL renders as an image. There is no separate word for images.
- **Never invent an image URL.** Use only URLs the author supplied, copied character for
  character. A URL assembled from memory or from a plausible-looking pattern does not resolve,
  and the learner gets a broken image where the prompt should be — the card is unusable and
  nothing in the compiler catches it.
- **Test every image URL before you emit it.** Fetch it and require a `2xx` status and an
  `image/*` content type — `curl -sIL -o /dev/null -w '%{http_code} %{content_type}' <url>`.
  Drop any URL that fails and fall back to text, as below. This applies to URLs the author
  pasted too: authors paste stale links.
- If the author asks for pictures but gives no URLs, **do not go looking for some.** Write the
  side as text naming what the picture would show and say the deck needs URLs. A text card is
  usable; a broken image is not.
- Only one source is safe to construct rather than copy, because its paths are built from a
  published code and not a content hash: country flags are
  `https://flagcdn.com/w320/<ISO 3166-1 alpha-2>.png` — `jp`, `br`, `eg`, `ca`. Wikimedia
  thumbnail paths embed a hash of the file (`/thumb/4/4d/…`); that hash cannot be derived from
  the file name, so a Wikimedia URL is only ever usable if the author pasted it.
- `theme` takes a bare tag, `theme DARK`, never the string `theme "dark"`.
- Do not shuffle or order the deck in the program — the player shuffles, and the learner's
  ratings decide what comes back.

## Example Patterns

- A bare deck:
  ```
  cards [["term" "definition"]] {}..
  ```
- Titled, with instructions:
  ```
  cards [
    ["photosynthesis" "process by which plants convert light to energy"]
    ["mitosis"        "cell division producing two identical cells"]
  ] title "Cell Biology"
    instructions "Flip each card to check yourself."
    {}..
  ```
- Math, in a dark deck:
  ```
  cards [
    ["$a^2 - b^2$"           "$(a+b)(a-b)$"]
    ["$\sin^2 x + \cos^2 x$" "$1$"]
  ] title "Identities" theme DARK {}..
  ```
