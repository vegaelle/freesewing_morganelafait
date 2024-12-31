/* A list of all measurements used by FreeSewing */
export const measurements = [
  'acrossFront',
  'acrossBack',
  'ankle',
  'biceps',
  'bustFront',
  'bustPointToUnderbust',
  'bustSpan',
  'chest',
  'crossSeam',
  'crossSeamFront',
  'crotchDepth',
  'heel',
  'head',
  'highBust',
  'highBustFront',
  'hips',
  'hpsToBust',
  'hpsToWaistBack',
  'hpsToWaistFront',
  'inseam',
  'knee',
  'neck',
  'neckline',
  'seat',
  'seatBack',
  'shoulderSlope',
  'shoulderToElbow',
  'shoulderToShoulder',
  'shoulderToWrist',
  'underbust',
  'upperLeg',
  'waist',
  'waistBack',
  'waistToArmpit',
  'waistToFloor',
  'waistToHips',
  'waistToKnee',
  'waistToNecklineFront',
  'waistToNecklineBack',
  'waistToSeat',
  'waistToUnderbust',
  'waistToUpperLeg',
  'wrist',
]

/* A list of measurments that are degrees (rather than mm) */
export const degreeMeasurements = ['shoulderSlope']

/* Helper method to determine whether a measurement uses degrees */
export const isDegreeMeasurement = (measie) => degreeMeasurements.indexOf(measie) !== -1
