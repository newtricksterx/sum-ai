import type { SummaryDocument } from "./types";
import { parseSummaryDocument } from "./document";
import { isRestrictedPage, resolveCurrentTab } from "../../FrontPage/utils/chromeTabs";

// Dev-mode summary fixture: a serialized SummaryDocument (JSON string, NOT HTML despite legacy variable name).
export const MOCK_SUMMARY_DOCUMENT = `
{
"title": "Introduction to Matrices and Linear Systems",
"format": "paragraph",
"blocks": [
{
"type": "heading",
"children": [
{ "text": "Matrices and Vectors" }
]
},
{
"type": "paragraph",
"children": [
{ "text": "A matrix " },
{ "text": "A", "var": true },
{ "text": " is a rectangular array of numbers, defined by its number of rows (" },
{ "text": "m", "var": true },
{ "text": ") and columns (" },
{ "text": "n", "var": true },
{ "text": "). For instance, a 3x2 matrix has three rows and two columns. When a matrix " },
{ "text": "A", "var": true },
{ "text": " multiplies a vector " },
{ "text": "x", "var": true },
{ "text": ", the product " },
{ "text": "Ax", "var": true },
{ "text": " can be understood as a " },
{ "text": "linear combination of the columns", "bold": true },
{ "text": " of " },
{ "text": "A", "var": true },
{ "text": ", where the components of " },
{ "text": "x", "var": true },
{ "text": " (e.g., " },
{ "text": "x₁", "var": true },
{ "text": ", " },
{ "text": "x₂", "var": true },
{ "text": ") act as coefficients for each column." }
]
},
{
"type": "paragraph",
"children": [
{ "text": "Alternatively, matrix-vector multiplication " },
{ "text": "Ax", "var": true },
{ "text": " can be calculated by taking the " },
{ "text": "dot product", "bold": true },
{ "text": " of each row of " },
{ "text": "A", "var": true },
{ "text": " with the vector " },
{ "text": "x", "var": true },
{ "text": ". Both methods yield the same result, but viewing " },
{ "text": "Ax", "var": true },
{ "text": " as a combination of columns offers a crucial conceptual shift in linear algebra, particularly when working with variables rather than specific numbers." }
]
},
{
"type": "heading",
"children": [
{ "text": "Solving Linear Equations" }
]
},
{
"type": "paragraph",
"children": [
{ "text": "A system of linear equations can be elegantly represented in " },
{ "text": "matrix form Ax = b", "bold": true },
{ "text": ". Here, " },
{ "text": "A", "var": true },
{ "text": " is the coefficient matrix, " },
{ "text": "x", "var": true },
{ "text": " is the vector of unknown variables, and " },
{ "text": "b", "var": true },
{ "text": " is the vector of constants on the right-hand side. The primary task shifts from computing " },
{ "text": "b", "var": true },
{ "text": " given " },
{ "text": "x", "var": true },
{ "text": " to solving for " },
{ "text": "x", "var": true },
{ "text": " when " },
{ "text": "b", "var": true },
{ "text": " is known. This is known as the " },
{ "text": "inverse problem", "bold": true },
{ "text": "." }
]
},
{
"type": "paragraph",
"children": [
{ "text": "Consider a specific matrix " },
{ "text": "A", "var": true },
{ "text": " called a " },
{ "text": "difference matrix", "bold": true },
{ "text": ", which produces a vector " },
{ "text": "b", "var": true },
{ "text": " whose components are the differences of the input vector " },
{ "text": "x", "var": true },
{ "text": ". For this particular " },
{ "text": "triangular matrix", "italic": true },
{ "text": ", the equations " },
{ "text": "Ax = b", "var": true },
{ "text": " are straightforward to solve sequentially. The existence of a unique solution for every " },
{ "text": "b", "var": true },
{ "text": " signifies that the matrix " },
{ "text": "A", "var": true },
{ "text": " is " },
{ "text": "invertible", "bold": true },
{ "text": ". The solution " },
{ "text": "x", "var": true },
{ "text": " can be expressed as " },
{ "text": "x = A⁻¹b", "var": true },
{ "text": ", where " },
{ "text": "A⁻¹", "var": true },
{ "text": " is the inverse matrix. For the difference matrix, its inverse is a " },
{ "text": "sum matrix", "bold": true },
{ "text": ", which calculates cumulative sums of the components of " },
{ "text": "b", "var": true },
{ "text": " to recover " },
{ "text": "x", "var": true },
{ "text": "." }
]
},
{
"type": "heading",
"children": [
{ "text": "Calculus Connection" }
]
},
{
"type": "paragraph",
"children": [
{ "text": "There's a strong analogy between these difference and sum matrices and concepts in calculus. The operation of finding differences (like " },
{ "text": "Ax", "var": true },
{ "text": ") is analogous to differentiation (" },
{ "text": "dx/dt = b(t)", "var": true },
{ "text": "), while the operation of summing (" },
{ "text": "A⁻¹b", "var": true },
{ "text": ") is analogous to integration (" },
{ "text": "x(t) = ∫ b dt", "var": true },
{ "text": "). This mirrors the " },
{ "text": "Fundamental Theorem of Calculus", "italic": true },
{ "text": ", which states that integration is the inverse of differentiation. Different schemes for calculating differences, such as forward, backward, or " },
{ "text": "centered differences", "bold": true },
{ "text": ", exist, with centered differences often providing the most accurate discrete approximation to a derivative." }
]
},
{
"type": "heading",
"children": [
{ "text": "Cyclic Differences and Dependence" }
]
},
{
"type": "paragraph",
"children": [
{ "text": "Not all matrices are invertible. Introducing a " },
{ "text": "cyclic difference matrix", "bold": true },
{ "text": " " },
{ "text": "C", "var": true },
{ "text": ", where the differences wrap around (e.g., " },
{ "text": "x₁ - x₃", "var": true },
{ "text": " in the first component), illustrates a non-invertible case. For " },
{ "text": "Cx = 0", "var": true },
{ "text": ", there are " },
{ "text": "infinitely many solutions", "bold": true },
{ "text": ": any vector where all components are equal (e.g., " },
{ "text": "(c, c, c)", "var": true },
{ "text": ") will result in zero differences. This is akin to the arbitrary constant of integration (+C) in calculus." }
]
},
{
"type": "paragraph",
"children": [
{ "text": "More commonly, for a system " },
{ "text": "Cx = b", "var": true },
{ "text": " with a cyclic difference matrix, there might be " },
{ "text": "no solution", "bold": true },
{ "text": " at all. This occurs if the right-hand side vector " },
{ "text": "b", "var": true },
{ "text": " does not satisfy a specific condition. For the cyclic difference matrix " },
{ "text": "C", "var": true },
{ "text": ", the sum of the components of " },
{ "text": "Cx", "var": true },
{ "text": " always equals zero. Therefore, a solution " },
{ "text": "x", "var": true },
{ "text": " exists only if " },
{ "text": "b₁ + b₂ + b₃ = 0", "var": true },
{ "text": ". Geometrically, this means that linear combinations of the columns of " },
{ "text": "C", "var": true },
{ "text": " do not span the entire three-dimensional space, but instead lie on a specific plane." }
]
},
{
"type": "heading",
"children": [
{ "text": "Vector Dependence" }
]
},
{
"type": "paragraph",
"children": [
{ "text": "The distinction between invertible and non-invertible matrices is tied to the " },
{ "text": "linear independence", "bold": true },
{ "text": " or " },
{ "text": "dependence", "bold": true },
{ "text": " of their column vectors. For the invertible difference matrix " },
{ "text": "A", "var": true },
{ "text": ", its columns " },
{ "text": "u, v, w", "var": true },
{ "text": " are linearly independent, meaning " },
{ "text": "w", "var": true },
{ "text": " cannot be expressed as a combination of " },
{ "text": "u", "var": true },
{ "text": " and " },
{ "text": "v", "var": true },
{ "text": ". These vectors together span the entire three-dimensional space." }
]
},
{
"type": "paragraph",
"children": [
{ "text": "In contrast, for the non-invertible cyclic difference matrix " },
{ "text": "C", "var": true },
{ "text": ", its third column " },
{ "text": "w*", "var": true },
{ "text": " is " },
{ "text": "linearly dependent", "bold": true },
{ "text": " on the first two columns " },
{ "text": "u", "var": true },
{ "text": " and " },
{ "text": "v", "var": true },
{ "text": " (specifically, " },
{ "text": "w* = -u - v", "var": true },
{ "text": "). This dependence means that " },
{ "text": "w*", "var": true },
{ "text": " already lies within the plane formed by " },
{ "text": "u", "var": true },
{ "text": " and " },
{ "text": "v", "var": true },
{ "text": ". Consequently, including " },
{ "text": "w*", "var": true },
{ "text": " does not expand the space reachable by linear combinations; they are confined to that plane, leading to scenarios of no or infinite solutions for " },
{ "text": "Cx = b", "var": true },
{ "text": "." }
]
}
]
}
`;

export const MOCK_FLASHCARDS_DOCUMENT: SummaryDocument = {
  title: "Flashcards",
  format: "flashcards",
  blocks: [
    {
      type: "flashcard",
      children: [],
      front: [{ text: "What is the core idea of this summary?" }],
      back: [
        { text: "It condenses the source into key takeaways so you can review quickly." },
      ],
    },
    {
      type: "flashcard",
      children: [],
      front: [{ text: "What does the summary keep from the original content?" }],
      back: [
        { text: "It keeps the main arguments, evidence, and practical insights." },
      ],
    },
    {
      type: "flashcard",
      children: [],
      front: [{ text: "How should you use this summary next?" }],
      back: [{ text: "Use it to decide what to read deeply and what to skim." }],
    },
  ],
};

export const MOCK_QUIZ_DOCUMENT: SummaryDocument = {
  title: "Quiz",
  format: "quiz",
  blocks: [
    {
      type: "question",
      children: [],
      question: [
        { text: "What training objective do large language models primarily use?" },
      ],
      options: [
        {
          key: "A",
          correct: false,
          children: [{ text: "Supervised classification on labeled datasets." }],
        },
        {
          key: "B",
          correct: true,
          children: [
            { text: "Self-supervised next-token prediction on large text corpora." },
          ],
        },
        {
          key: "C",
          correct: false,
          children: [{ text: "Reinforcement learning from environment rewards." }],
        },
        {
          key: "D",
          correct: false,
          children: [{ text: "Generative adversarial training." }],
        },
      ],
      explanation: [
        { text: "LLMs are first trained with self-supervised next-token prediction." },
      ],
    },
    {
      type: "question",
      children: [],
      question: [{ text: "Which architecture powers most modern LLMs?" }],
      options: [
        {
          key: "A",
          correct: false,
          children: [{ text: "Recurrent neural networks." }],
        },
        {
          key: "B",
          correct: false,
          children: [{ text: "Convolutional neural networks." }],
        },
        {
          key: "C",
          correct: true,
          children: [{ text: "Transformers with attention." }],
        },
        {
          key: "D",
          correct: false,
          children: [{ text: "Restricted Boltzmann machines." }],
        },
      ],
      explanation: [
        {
          text: "Transformers use attention to model relationships across long sequences.",
        },
      ],
    },
  ],
};

export const MOCK_SUMMARY_ACTION_ITEM_DOCUMENT: SummaryDocument =
  parseSummaryDocument(MOCK_SUMMARY_DOCUMENT) ?? {
    title: "Summary",
    format: "paragraph",
    blocks: [],
  };

export const isMockModeEnabled = () =>
  import.meta.env.DEV ||
  import.meta.env.VITE_DEV === "true" ||
  import.meta.env.VITE_USE_MOCK_SUMMARY === "true";

export const isMockActionItemModeEnabled = () =>
  import.meta.env.DEV ||
  import.meta.env.VITE_DEV === "true" ||
  import.meta.env.VITE_USE_MOCK_ACTION_ITEM === "true";

export const isAnyActionItemMockEnabled = () =>
  isMockModeEnabled() || isMockActionItemModeEnabled();

// In dev/mock mode, returns the active tab's URL when it's a real page; otherwise synthesizes a sentinel mock URL.
export const getMockSourceUrl = async () => {
  const tab = await resolveCurrentTab();
  if (tab?.url && !isRestrictedPage(tab.url)) {
    return tab.url;
  }
  return `mock://dev-summary/12121212124343431212121${Date.now()}`;
};
