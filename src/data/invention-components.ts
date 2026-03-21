import type { InventionComponent } from "@/types";

export const inventionComponents: InventionComponent[] = [
  // ── Telephone (1876) ──────────────────────────────────────────────────────
  {
    id: "telephone-diaphragm",
    inventionId: "telephone",
    name: "Diaphragm",
    description:
      "A thin, taut membrane of goldbeater's skin or parchment stretched across the mouthpiece. Sound pressure waves cause it to vibrate, directly modulating the electrical current through the electromagnet.",
    materials: ["Parchment", "Goldbeater's skin"],
    patentText:
      "A membrane arranged to vibrate in response to vocal sound, communicating motion to a magnetised armature to undulate the electric current.",
    file: "telephone-diaphragm.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#d4a96a",
  },
  {
    id: "telephone-housing",
    inventionId: "telephone",
    name: "Wooden Housing",
    description:
      "Hand-crafted walnut or oak cabinet housing the electromagnetic transmitter and receiver. The dense wood reduces acoustic interference and gives the instrument its characteristic Victorian solidity.",
    materials: ["Walnut", "Oak", "Brass screws"],
    patentText:
      "An enclosure of non-conductive material providing mechanical support for the electromagnetic assembly and acoustic isolation.",
    file: "telephone-housing.glb",
    offset: [0, -0.6, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.6, 0],
    color: "#7c4f2a",
  },
  {
    id: "telephone-coil",
    inventionId: "telephone",
    name: "Electromagnet Coil",
    description:
      "A spool of fine copper wire wound around a permanent iron magnet. Vibrations of the diaphragm alter the magnetic flux, inducing a corresponding undulating current in the coil — the electrical analogue of the original sound.",
    materials: ["Copper wire", "Iron core", "Shellac insulation"],
    patentText:
      "An electromagnet whose armature is set in vibration by the undulating current, reproducing the original vocal motion at the receiving end.",
    file: "telephone-coil.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#b87333",
  },
  {
    id: "telephone-receiver",
    inventionId: "telephone",
    name: "Receiver Horn",
    description:
      "A flared acoustic horn pressed to the listener's ear that amplifies and channels the reproduced sound waves from the receiving diaphragm. Early models were identical to the transmitter horn — Bell's apparatus was truly bidirectional.",
    materials: ["Vulcanite", "Brass"],
    patentText:
      "A conical or cylindrical acoustic coupler directing reproduced sound waves to the human ear with minimal loss.",
    file: "telephone-receiver.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#5a5a5a",
  },
  {
    id: "telephone-battery",
    inventionId: "telephone",
    name: "Battery Terminal",
    description:
      "A wet-cell galvanic battery providing the direct-current bias necessary to establish the baseline magnetic field. Without the standing current, the varying resistance of the diaphragm-to-coil gap could not modulate a signal.",
    materials: ["Zinc", "Copper", "Sulfuric acid", "Glass jar"],
    patentText:
      "A voltaic cell supplying a continuous current upon which vocal undulations are superimposed for transmission.",
    file: "telephone-battery.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#4a7c59",
  },

  // ── iPhone (2007) ─────────────────────────────────────────────────────────
  {
    id: "iphone-display",
    inventionId: "iphone",
    name: "Display Assembly",
    description:
      "A 3.5-inch multi-touch capacitive display protected by optical-grade glass. The projected capacitive sensor grid beneath the glass detects the self-capacitance of up to ten simultaneous finger contacts, enabling the pinch, swipe, and tap gestures that defined the smartphone era.",
    materials: ["Corning glass", "ITO sensor layer", "LCD panel", "Aluminum bezel"],
    patentText:
      "A transparent touch-sensitive surface using capacitive sensing to detect multiple simultaneous input points for direct-manipulation gesture recognition.",
    file: "iphone-display.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#0ea5e9",
  },
  {
    id: "iphone-logic-board",
    inventionId: "iphone",
    name: "Logic Board",
    description:
      "The Samsung-manufactured ARM-based application processor (clocked at 412 MHz) paired with 128 MB of RAM on a compact multi-layer PCB. Running iPhone OS 1.0, this board orchestrates every function of the device from the cellular radio to the touchscreen.",
    materials: ["FR4 PCB", "ARM silicon", "BGA packages", "Copper traces"],
    patentText:
      "A miniaturised computing module integrating processor, memory, and I/O controllers on a single substrate for handheld operation.",
    file: "iphone-logic-board.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#a855f7",
  },
  {
    id: "iphone-battery",
    inventionId: "iphone",
    name: "Battery",
    description:
      "A 1400 mAh lithium-ion polymer cell providing up to 8 hours of talk time. The flat pouch format allowed Apple to maximise energy density within the slender 11.6 mm aluminium chassis — a geometry impossible with cylindrical cells.",
    materials: ["Lithium cobalt oxide", "Graphite", "Polymer electrolyte"],
    patentText:
      "A rechargeable lithium-ion polymer cell in a planar enclosure, delivering sustained power to a portable communications device.",
    file: "iphone-battery.glb",
    offset: [0, -0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.8, 0],
    color: "#22c55e",
  },
  {
    id: "iphone-camera",
    inventionId: "iphone",
    name: "Camera Module",
    description:
      "A 2-megapixel fixed-focus camera module with a CMOS image sensor and a single plastic lens element. Though modest by later standards, it was seamlessly integrated into the OS and introduced millions of users to always-available pocket photography.",
    materials: ["CMOS silicon", "Plastic lens", "IR filter", "Flex cable"],
    patentText:
      "An imaging module comprising a lens assembly and solid-state sensor integrated within a handheld electronic device for photographic capture.",
    file: "iphone-camera.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#64748b",
  },
  {
    id: "iphone-speaker",
    inventionId: "iphone",
    name: "Speaker Assembly",
    description:
      "A micro-speaker at the base of the device paired with a separate earpiece speaker at the top, both driven by a custom audio codec. The dual-speaker arrangement let the iPhone serve simultaneously as telephone, music player, and speakerphone without external accessories.",
    materials: ["Neodymium magnet", "Voice coil", "Polymer cone", "Steel basket"],
    patentText:
      "An acoustic transducer assembly providing audible reproduction of telephony, media, and alert signals in a handheld form factor.",
    file: "iphone-speaker.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#94a3b8",
  },

  // ── Steam Engine (1769) ───────────────────────────────────────────────────
  {
    id: "steam-piston",
    inventionId: "steam-engine",
    name: "Piston",
    description:
      "A close-fitting cast-iron disc that slides back and forth inside the cylinder under the alternating pressure of steam and vacuum. Watt's improved piston packing — using hemp rope soaked in tallow — reduced leakage and dramatically improved the work extracted per stroke.",
    materials: ["Cast iron", "Hemp packing", "Tallow"],
    patentText:
      "A reciprocating element fitted within a cylinder, moved by the elastic force of steam to produce mechanical work.",
    file: "steam-piston.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#78716c",
  },
  {
    id: "steam-cylinder",
    inventionId: "steam-engine",
    name: "Cylinder",
    description:
      "A vertical or horizontal cast-iron tube in which steam expands against the piston. Watt insulated the cylinder with a wooden jacket to maintain its temperature, preventing the energy waste that plagued Newcomen's design where cold injection water chilled the whole cylinder each stroke.",
    materials: ["Cast iron", "Wood jacket", "Lead gaskets"],
    patentText:
      "A steam cylinder maintained at steam temperature throughout the cycle, avoiding thermal losses incident to alternating heating and cooling.",
    file: "steam-cylinder.glb",
    offset: [0, 0, -0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, -0.8],
    color: "#a8a29e",
  },
  {
    id: "steam-flywheel",
    inventionId: "steam-engine",
    name: "Flywheel",
    description:
      "A heavy cast-iron disc mounted on the crankshaft that stores kinetic energy during the power stroke and releases it through the dead centres. The flywheel smoothed the inherently jerky reciprocating motion into steady rotary power suitable for driving mills and factories.",
    materials: ["Cast iron"],
    patentText:
      "A rotating mass of sufficient inertia to equalise the torque output of a reciprocating engine over a complete cycle.",
    file: "steam-flywheel.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#44403c",
  },
  {
    id: "steam-beam",
    inventionId: "steam-engine",
    name: "Beam",
    description:
      "A massive pivoting timber or cast-iron lever balanced on a central fulcrum — the defining visual feature of a Watt beam engine. The piston rod connects to one end via a chain or parallel motion linkage, while the other end drives the pump or crankshaft.",
    materials: ["Cast iron", "Oak"],
    patentText:
      "A pivoted lever transmitting force from the piston rod to the load, maintaining alignment through the parallel-motion mechanism.",
    file: "steam-beam.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#292524",
  },
  {
    id: "steam-condenser",
    inventionId: "steam-engine",
    name: "Separate Condenser",
    description:
      "Watt's pivotal invention: a separate cool vessel connected to the cylinder by a valve. After each power stroke the valve opens, steam rushes into the cold condenser and collapses instantly, creating a vacuum without ever chilling the main cylinder. This single innovation quadrupled fuel efficiency.",
    materials: ["Copper", "Iron", "Cold water jacket"],
    patentText:
      "A vessel separate from the cylinder, kept always cold, into which steam is condensed by injection or surface cooling, preserving the cylinder at steam temperature.",
    file: "steam-condenser.glb",
    offset: [0, -0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.8, 0],
    color: "#3b82f6",
  },
  {
    id: "steam-boiler",
    inventionId: "steam-engine",
    name: "Boiler",
    description:
      "A riveted wrought-iron vessel in which water is heated by a coal or wood fire to generate steam at pressures of 2–5 psi. Early Watt engines used low pressure for safety — the boiler was simply a sealed iron pot — but the reliable supply of dry steam was essential to consistent engine performance.",
    materials: ["Wrought iron", "Copper rivets", "Fire brick lining"],
    patentText:
      "A closed vessel in which water is converted to steam by the application of heat, supplying elastic vapour to the engine cylinder.",
    file: "steam-boiler.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#7c3f1a",
  },

  // ── Telescope (1609) ──────────────────────────────────────────────────────
  {
    id: "telescope-objective",
    inventionId: "telescope",
    name: "Objective Lens",
    description:
      "A large convex crown-glass lens ground by Galileo himself, with a focal length of roughly 1.7 m. It gathers far more light than the naked eye and refracts parallel rays to a focus, forming a real intermediate image that the eyepiece then magnifies.",
    materials: ["Crown glass", "Lead frame"],
    patentText:
      "A convex lens of long focal length gathering and converging incident light to form an intermediate image of a distant object.",
    file: "telescope-objective.glb",
    offset: [0, 0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0.8, 0],
    color: "#bfdbfe",
  },
  {
    id: "telescope-eyepiece",
    inventionId: "telescope",
    name: "Eyepiece Lens",
    description:
      "A small concave (diverging) lens placed inside the focal point of the objective, intercepting the converging cone of light before it reaches focus. This Galilean configuration produces an upright, magnified virtual image — a key advantage for terrestrial observation — at the cost of a narrow field of view.",
    materials: ["Flint glass", "Brass cell"],
    patentText:
      "A concave lens placed within the focal length of the objective to intercept converging rays and produce an erect magnified virtual image.",
    file: "telescope-eyepiece.glb",
    offset: [0, -0.8, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, -0.8, 0],
    color: "#93c5fd",
  },
  {
    id: "telescope-outer-barrel",
    inventionId: "telescope",
    name: "Outer Barrel",
    description:
      "A long tube of rolled lead sheet or cardboard covered in red leather that houses the objective lens and forms the fixed outer body of the instrument. Its length — approximately 1.8 m — is dictated by the focal length of the objective, illustrating the optics directly in the instrument's proportions.",
    materials: ["Lead sheet", "Cardboard", "Red leather", "Brass fittings"],
    patentText:
      "A tubular enclosure of sufficient length to accommodate the objective focal length, providing structural rigidity and stray-light exclusion.",
    file: "telescope-outer-barrel.glb",
    offset: [-0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [-0.8, 0, 0],
    color: "#7c2d12",
  },
  {
    id: "telescope-inner-barrel",
    inventionId: "telescope",
    name: "Inner Barrel",
    description:
      "A sliding inner tube carrying the eyepiece lens, allowing the observer to adjust focus by pushing or pulling it within the outer barrel. This simple rack-free sliding mechanism was Galileo's elegant solution to focusing on objects at different distances.",
    materials: ["Cardboard", "Brass rim"],
    patentText:
      "A sliding tubular member carrying the eyepiece, adjustable along the optical axis to focus the instrument on objects at varying distances.",
    file: "telescope-inner-barrel.glb",
    offset: [0.8, 0, 0],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0.8, 0, 0],
    color: "#92400e",
  },
  {
    id: "telescope-lens-rings",
    inventionId: "telescope",
    name: "Lens Mount Rings",
    description:
      "Turned brass rings that clamp and centre each lens within its barrel, maintaining precise alignment on the optical axis. The quality of these mechanical fittings limited Galileo's early instruments to ~8× magnification; later refinements brought his best telescopes to ~30×.",
    materials: ["Brass", "Felt padding"],
    patentText:
      "Mechanical retaining rings securing optical elements coaxially within the tube to maintain alignment of the optical train.",
    file: "telescope-lens-rings.glb",
    offset: [0, 0, 0.8],
    assembledPosition: [0, 0, 0],
    explodedPosition: [0, 0, 0.8],
    color: "#d97706",
  },
];

export function getComponentsByInventionId(inventionId: string): InventionComponent[] {
  return inventionComponents.filter((component) => component.inventionId === inventionId);
}

export function getComponentById(componentId: string): InventionComponent | undefined {
  return inventionComponents.find((component) => component.id === componentId);
}
