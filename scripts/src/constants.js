export const MODULE_ID = "pneuma-quickhack";
export const JACK_IN_ACTION = "jack-in-person";
export const JACK_IN_RANGE_SQUARES = 25;

export const RESULT_VISIBILITY = Object.freeze({ GM_ONLY: 0, PUBLIC: 1, SOURCE_OWNERS: 2 });

// Phase 2 will expose these as GM-only settings. These values preserve the original macro.
export const JACK_IN_DEFAULTS = Object.freeze({
  resultVisibility: RESULT_VISIBILITY.PUBLIC,
  awareTargetResultIsPublic: false,
  hideSourceInTargetResult: true
});
