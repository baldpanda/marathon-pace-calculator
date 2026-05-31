<script lang="ts">
  import SegmentTimeline from './lib/SegmentTimeline.svelte';
  import {
    formatPace,
    formatTime,
    paceToTotalSeconds,
    parsePace,
    parseTime,
    totalSecondsToPace,
  } from './lib/pace';
  import { DEFAULT_DISTANCE, DISTANCES, type DistanceKey } from './lib/distance';

  let distanceKey = $state<DistanceKey>(DEFAULT_DISTANCE);
  let paceInput = $state('');
  let timeInput = $state('');
  let lastEdited = $state<'pace' | 'time' | null>(null);

  const distanceKm = $derived(DISTANCES[distanceKey]);
  const PLACEHOLDER_PACE_SECONDS = 270;
  const pacePlaceholder = $derived(formatPace(PLACEHOLDER_PACE_SECONDS));
  const timePlaceholder = $derived(
    formatTime(paceToTotalSeconds(PLACEHOLDER_PACE_SECONDS, distanceKm)),
  );

  function onPaceInput(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    paceInput = value;
    lastEdited = 'pace';
    const secondsPerKm = parsePace(value);
    timeInput = secondsPerKm === null ? '' : formatTime(paceToTotalSeconds(secondsPerKm, distanceKm));
  }

  function onTimeInput(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    timeInput = value;
    lastEdited = 'time';
    const totalSeconds = parseTime(value);
    paceInput = totalSeconds === null ? '' : formatPace(totalSecondsToPace(totalSeconds, distanceKm));
  }

  function onDistanceChange(next: DistanceKey) {
    distanceKey = next;
    const nextKm = DISTANCES[next];
    if (lastEdited === 'time') {
      const totalSeconds = parseTime(timeInput);
      paceInput = totalSeconds === null ? '' : formatPace(totalSecondsToPace(totalSeconds, nextKm));
    } else {
      const secondsPerKm = parsePace(paceInput);
      timeInput = secondsPerKm === null ? '' : formatTime(paceToTotalSeconds(secondsPerKm, nextKm));
    }
  }
</script>

<main>
  <h1>Marathon Pace Calculator</h1>
  <p class="muted">Enter pace per km or total time. Distance: {distanceKm.toFixed(distanceKm % 1 === 0 ? 0 : 4)} km.</p>

  <div class="field">
    <label for="pace">Pace</label>
    <div class="input-row">
      <input
        id="pace"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder={pacePlaceholder}
        value={paceInput}
        oninput={onPaceInput}
      />
      <span class="unit">min/km</span>
    </div>
  </div>

  <div class="field">
    <label for="time">Total time</label>
    <div class="input-row">
      <input
        id="time"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder={timePlaceholder}
        value={timeInput}
        oninput={onTimeInput}
      />
      <span class="unit">hh:mm:ss</span>
    </div>
  </div>

  <SegmentTimeline {distanceKey} {onDistanceChange} />
</main>

<style>
  main {
    max-width: 32rem;
    margin: 0 auto;
    padding: 2rem 1.25rem;
  }
  h1 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
  }
  p {
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }
  .muted {
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .field {
    margin-bottom: 1.25rem;
  }
  label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 0.375rem;
    color: var(--color-muted);
  }
  .input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  input {
    flex: 1;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #2a2f3a;
    border-radius: 0.5rem;
    background: #161a22;
    color: var(--color-fg);
    font: inherit;
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
  }
  input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .unit {
    color: var(--color-muted);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
    min-width: 4.5rem;
  }
</style>
