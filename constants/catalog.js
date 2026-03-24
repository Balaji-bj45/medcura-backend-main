const DEFAULT_CATEGORIES = [
  {
    name: "Hospital Beds",
    slug: "hospital-beds",
    description: "Manual and electric beds for home care, clinics, and hospitals.",
    sortOrder: 1,
  },
  {
    name: "Oxygen Equipment",
    slug: "oxygen-equipment",
    description: "Concentrators, cylinders, and oxygen accessories for respiratory support.",
    sortOrder: 2,
  },
  {
    name: "Mobility Aids",
    slug: "mobility-aids",
    description: "Wheelchairs, walkers, and daily mobility assistance devices.",
    sortOrder: 3,
  },
  {
    name: "Respiratory Care",
    slug: "respiratory-care",
    description: "Nebulizers, CPAP devices, and pulmonary therapy equipment.",
    sortOrder: 4,
  },
  {
    name: "Patient Monitoring",
    slug: "patient-monitoring",
    description: "Vital monitoring devices including ECG, SPO2, BP, and temperature systems.",
    sortOrder: 5,
  },
  {
    name: "Rehabilitation Aids",
    slug: "rehabilitation-aids",
    description: "Recovery and physiotherapy tools for post-operative and long-term rehab.",
    sortOrder: 6,
  },
];

const ALLOWED_CATEGORIES = DEFAULT_CATEGORIES.map((item) => item.name);

module.exports = {
  ALLOWED_CATEGORIES,
  DEFAULT_CATEGORIES,
};
