## Problem

The preview is blank because SSR is crashing with:

```
Cannot find module '@/assets/vallalar_study.jpg' imported from src/routes/story.tsx
```

`src/routes/story.tsx` imports three assets with the wrong extension. The files on disk are `.jpeg`, but the imports use `.jpg`:

| Import in story.tsx | Actual file in src/assets |
| --- | --- |
| `@/assets/gnana_sabai_over.jpg` | `gnana_sabai_over.jpeg` |
| `@/assets/vallalar_study.jpg` | `vallalar_study.jpeg` |
| `@/assets/vallalar_with_animals_2.jpg` | `vallalar_with_animals_2.jpeg` |

Because the root route renders these imports during SSR, every page (including `/sign`) returns 500 and the preview is blank — that's why the Digital Signing enhancements look like they "aren't working".

## Fix

Update the four import paths in `src/routes/story.tsx` to use `.jpeg`:

- `@/assets/gnana_sabai_over.jpg` → `@/assets/gnana_sabai_over.jpeg` (two occurrences: `sanctuaryImg` and `gatheringImg`)
- `@/assets/vallalar_study.jpg` → `@/assets/vallalar_study.jpeg`
- `@/assets/vallalar_with_animals_2.jpg` → `@/assets/vallalar_with_animals_2.jpeg`

No other files need changes. Once SSR stops crashing, the cascading country/state/district dropdowns on `/sign` will render normally.
