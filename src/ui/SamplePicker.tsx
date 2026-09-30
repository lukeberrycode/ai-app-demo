import { SAMPLE_DESCRIPTIONS } from "./samples.ts";

/** Offers the bundled sample invoices, so the app can be tried without one. */
export function SamplePicker({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (file: string) => void;
}) {
  return (
    <section className="samples" aria-labelledby="samples-heading">
      <h2 id="samples-heading">Try a sample invoice</h2>
      <p className="muted">
        Synthetic invoices made for this demo. Each one is read by the AI model,
        just like an upload.
      </p>
      <ul>
        {SAMPLE_DESCRIPTIONS.map((sample) => (
          <li key={sample.file}>
            <button
              type="button"
              className="sample"
              disabled={disabled}
              onClick={() => onPick(sample.file)}
            >
              <strong>{sample.title}</strong>
              <span>{sample.shows}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
