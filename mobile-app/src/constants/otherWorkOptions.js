/**
 * "Other" job subcategories — shared by Post Job, Available Jobs filter, and Settings preference.
 */

export function normalizeOtherOption(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/[()]/g, '')
    .replace(/[/]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const OTHER_WORK_OPTIONS_RAW = [
  'Others',
  'Interior decorator',
  'Carpenter / furniture maker',
  'Floor tiler (tiles, marble, granite)',
  'Painter (wall, texture, spray)',
  'POP (Plaster of Paris) worker',
  'False ceiling installer',
  'Welder',
  'Mason (brick/block work)',
  'Glass & window installer (aluminum/uPVC)',
  'Cabinet maker',
  'Wood polisher / finisher',
  'Sofa maker / upholsterer',
  'Modular kitchen installer',
  'Door & window fabricator',
  'Bamboo craftsman',
  'Gardener / landscaper',
  'Nursery plant caretaker',
  'Irrigation system installer',
  'Lawn maintenance worker',
  'Tree trimmer / cutter',
  'Potter (clay items)',
  'Sculptor',
  'Handicraft maker',
  'Textile weaver',
  'Embroidery worker',
  'Leather goods maker',
  'Candle / soap maker',
  'Pest control technician',
  'Housekeeping staff',
  'Waste management worker',
  'Mobile repair technician',
  'HVAC (AC) technician',
  'Refrigeration mechanic',
  'AC & refrigerator mechanic',
  'TV / appliance repair technician',
  'Generator repair technician',
  'CCTV installation technician',
  'Warehouse handler',
  'Packing & moving labor',
  'Heavy equipment operator (JCB, crane, etc.)',
  'Makeup artist',
  'Mehndi artist',
  'Fitness trainer (skill-based)',
  'Solar panel installer',
  'Solar maintenance technician',
  'Fire safety equipment installer',
  'Waterproofing specialist',
  'Roofing worker',
  'Drone operator',
  'Photographer / videographer',
  'Video editor (skill > degree)',
  'Social media content creator',
  'Freelance graphic designer',
  'Scaffolding specialist',
  'Formwork (shuttering) carpenter',
  'Steel fixer (rebar worker)',
  'Concrete pump operator',
  'Tower crane operator',
  'Excavator / JCB operator',
  'Road roller operator',
  'Asphalt paving specialist',
  'Basement sealing expert',
  'High-voltage line technician',
  'Industrial electrician',
  'Wind turbine technician',
  'Transformer repair technician',
  'Electrical panel board fabricator',
  'Cable tray installer',
  'Lightning protection system installer',
  'Duct fabrication specialist',
  'Ventilation system installer',
  'Boiler operator',
  'Chiller plant technician',
  'Cooling tower technician',
  'Gas pipeline installer',
  'Compressed air system technician',
  'MIG/TIG welder',
  'CNC machine operator',
  'Lathe machine operator',
  'Sheet metal fabricator',
  'Aluminum fabricator',
  'Steel structure fabricator',
  'Pipe fitter',
  'Industrial rigging specialist',
  'Blacksmith',
  'Drainage system specialist',
  'Fire sprinkler system installer',
  'Water treatment plant technician',
  'Sewage treatment plant operator',
  'Fire alarm system technician',
  'Access control system installer',
  'Security system integrator',
  'Smoke detector installer',
  'Rainwater harvesting technician',
  'Biogas plant technician',
  'EV (electric vehicle) charging station installer',
  'Smart home automation technician',
  'Fiber optic cable technician',
  'Data cabling technician',
];

export const OTHER_WORK_OPTIONS = (() => {
  const seen = new Set();
  const out = [];
  for (const opt of OTHER_WORK_OPTIONS_RAW) {
    const key = normalizeOtherOption(opt);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opt.trim());
  }
  return out;
})();

export const OTHER_SUBCATEGORIES = OTHER_WORK_OPTIONS.filter((opt) => opt !== 'Others');
