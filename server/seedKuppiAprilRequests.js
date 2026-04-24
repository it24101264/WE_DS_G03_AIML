require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./src/models/User");
const KuppiRequest = require("./src/models/KuppiRequest");

const YEAR = 2026;
const MONTH_INDEX = 3;
const REQUEST_PREFIX = "seed_apr2026";

const WMT_DESCRIPTIONS = [
  "Need help understanding responsive web design breakpoints and mobile-first layout planning.",
  "Stuck with CSS flexbox alignment for a navigation bar that breaks on smaller phone screens.",
  "Need a clear explanation of media queries and when to switch between tablet and mobile layouts.",
  "Having trouble building a semantic HTML structure for a product landing page assignment.",
  "Want support on CSS grid versus flexbox and when each layout method should be used in WMT.",
  "Need help making a login form accessible with proper labels, focus states, and validation hints.",
  "Confused about JavaScript DOM event bubbling and how click handlers behave in nested elements.",
  "Need support with fetch API basics and showing server data inside a simple web interface.",
  "Struggling to connect a mobile-friendly frontend form to a backend API endpoint correctly.",
  "Need help understanding local storage, session storage, and which one fits a mobile web app.",
  "Having trouble debugging a hamburger menu animation on a responsive navigation component.",
  "Need clarification on viewport units and why some sections overflow on Android browsers.",
  "Want guidance on converting a desktop-only web page into a responsive mobile layout.",
  "Need help styling cards consistently across devices with padding, shadows, and typography scale.",
  "Confused about form validation using JavaScript and how to show useful error messages.",
  "Need support with image optimization for web and mobile views without losing too much quality.",
  "Struggling to use async and await properly when loading data for a student dashboard page.",
  "Need help understanding REST API request methods and how frontend code should call them.",
  "Want to learn how to structure reusable components for a small web and mobile interface project.",
  "Having trouble fixing horizontal scrolling caused by width settings in a mobile layout.",
  "Need help with CSS positioning because my floating action button overlaps other content on phones.",
  "Confused about progressive enhancement and graceful degradation in web and mobile experiences.",
  "Need support implementing dark readable text over a gradient hero section without accessibility issues.",
  "Struggling to make tables usable on mobile and need ideas for responsive alternatives.",
  "Need help connecting an image upload field from the frontend to a server endpoint.",
  "Want support on using JavaScript array methods to render filtered items on a webpage.",
  "Having trouble understanding how CORS affects frontend requests to a separate backend server.",
  "Need help debugging a React Native style layout that should match a companion web page.",
  "Confused about token storage options for authentication in a web and mobile phone tech context.",
  "Need a walkthrough of client-side routing concepts and navigation patterns for single page apps.",
  "Need help designing a consistent color and spacing system for a mobile-first UI assignment.",
  "Struggling with touch target sizing and spacing guidelines for mobile user interface controls.",
  "Need support on creating modal dialogs that work well with keyboard and mobile interactions.",
  "Want help understanding JSON parsing and rendering API results inside list components.",
  "Having trouble with debounce logic for a search field in a mobile-friendly interface.",
  "Need clarification on service workers and the basics of offline support in web apps.",
  "Need help making a registration page responsive while keeping the design visually balanced.",
  "Confused about the difference between controlled and uncontrolled form inputs in frontend apps.",
  "Struggling to align icons and labels properly in a bottom navigation bar for a phone layout.",
  "Need help building a small chat-style interface with auto-scroll and new message rendering.",
  "Want support on typography hierarchy for headings, captions, and body text in web pages.",
  "Need help with CSS transitions because my card hover effect behaves oddly on touch devices.",
  "Having trouble displaying validation errors from an API response inside a frontend form.",
  "Need support with pagination UI and how to keep it usable on narrow mobile screens.",
  "Confused about environment variables in frontend projects and when values are exposed to clients.",
  "Need help integrating a date picker and formatting selected values for submission.",
  "Want a better understanding of component state updates and re-render behavior in a mobile UI.",
  "Struggling with sticky headers in a scrollable content page for a student portal.",
  "Need help organizing CSS files and reusable style rules for a medium-sized frontend project.",
  "Having trouble mapping backend response fields correctly into frontend cards and detail views.",
];

const OSSA_DESCRIPTIONS = [
  "Need help understanding process states and how the operating system switches between them.",
  "Confused about CPU scheduling algorithms and how round robin differs from shortest job first.",
  "Need support with memory management concepts like paging, segmentation, and address translation.",
  "Struggling to understand deadlock conditions and how avoidance differs from prevention.",
  "Need help learning basic Linux file permissions and how chmod values are interpreted.",
  "Want a walkthrough of shell commands for navigating directories and managing files safely.",
  "Having trouble understanding process creation with fork and parent-child relationships.",
  "Need support on threads versus processes and when multithreading improves performance.",
  "Confused about virtual memory and why page faults happen during program execution.",
  "Need help with disk scheduling algorithms and how seek time affects system performance.",
  "Need support understanding inode structures and how files are mapped in Unix systems.",
  "Struggling with shell scripting basics including variables, loops, and conditional statements.",
  "Need help explaining semaphores and mutexes using simple synchronization examples.",
  "Want to understand context switching overhead and why too many threads can slow a system.",
  "Having trouble with user management commands like useradd, passwd, and group assignments.",
  "Need help understanding how cron jobs work and how to schedule recurring admin tasks.",
  "Confused about system calls and the boundary between user mode and kernel mode.",
  "Need support with file system mounting and how Linux handles devices and mount points.",
  "Struggling to understand producers and consumers with bounded buffer synchronization.",
  "Need help with command line tools for monitoring CPU, memory, and process usage.",
  "Want support on log file analysis and how to trace service startup failures.",
  "Need help comparing contiguous allocation, paging, and segmentation in operating systems.",
  "Confused about swap space and when systems move memory pages to disk.",
  "Need support writing a shell script to back up selected folders with timestamps.",
  "Struggling with race conditions and how critical sections should be protected.",
  "Need help understanding boot sequence stages from firmware to kernel to user space.",
  "Want a clear explanation of zombies and orphan processes in Unix-like systems.",
  "Having trouble using grep, awk, and sed together for a small system administration task.",
  "Need help with SSH key setup and secure remote access between lab machines.",
  "Confused about package managers and safe ways to install or update system software.",
  "Need support understanding DNS lookup flow from resolver to authoritative name server.",
  "Struggling with firewall basics and how to reason about inbound and outbound rules.",
  "Need help learning how systemd services are created, started, and checked for failures.",
  "Want to understand RAID levels and which tradeoffs matter for redundancy and speed.",
  "Need support with shell redirection, pipes, and combining commands in admin workflows.",
  "Having trouble understanding interprocess communication with pipes and shared memory.",
  "Need help with access control concepts including least privilege and sudo configuration.",
  "Confused about file descriptors and how stdin, stdout, and stderr are handled.",
  "Struggling to debug a permission denied error when running scripts on Linux.",
  "Need help understanding kernel modules and the basics of loading and unloading them.",
  "Want support on network troubleshooting using ping, traceroute, netstat, and ss.",
  "Need help comparing hard links and symbolic links with practical examples.",
  "Having trouble understanding backup rotation strategies and restore testing.",
  "Need support on command history, aliases, and shell profile customization.",
  "Confused about how environment variables are inherited by child processes.",
  "Need help understanding sockets and how client-server communication works at OS level.",
  "Struggling with disk partitions, file systems, and formatting steps for a new drive.",
  "Need support interpreting top output and identifying resource-hungry processes.",
  "Want a simple explanation of access logs, auth logs, and kernel logs in Linux.",
  "Need help planning basic server hardening steps for a classroom Linux machine.",
];

function slotLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

function buildDate(day, hour, minute) {
  return new Date(Date.UTC(YEAR, MONTH_INDEX, day, hour, minute, 0, 0));
}

function buildAvailabilitySlots(seedIndex) {
  const firstDay = (seedIndex % 28) + 1;
  const secondDay = ((seedIndex + 8) % 28) + 1;
  const firstHour = 8 + (seedIndex % 9);
  const secondHour = 10 + ((seedIndex * 2) % 8);
  const first = buildDate(firstDay, firstHour, seedIndex % 2 === 0 ? 0 : 30);
  const second = buildDate(secondDay, secondHour, seedIndex % 3 === 0 ? 0 : 30);
  return [slotLabel(first), slotLabel(second)];
}

function buildCreatedAt(seedIndex) {
  const day = (seedIndex % 30) + 1;
  const hour = 8 + ((seedIndex * 3) % 11);
  const minute = (seedIndex * 7) % 60;
  return buildDate(day, hour, minute);
}

function buildDocs(topic, descriptions, users, offset) {
  return descriptions.map((description, index) => {
    const globalIndex = offset + index;
    const createdAt = buildCreatedAt(globalIndex);
    return {
      id: `${REQUEST_PREFIX}_${topic.toLowerCase()}_${String(index + 1).padStart(3, "0")}`,
      userId: users[globalIndex % users.length].id,
      topic,
      topicKey: topic.toLowerCase(),
      description,
      availabilitySlots: buildAvailabilitySlots(globalIndex),
      status: "PENDING",
      groupId: null,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const students = await User.find({ role: "student" }).sort({ createdAt: 1 }).select({ id: 1, name: 1 }).lean();
    if (!students.length) {
      throw new Error("No student users found. Cannot attach requests to existing users.");
    }

    const docs = [
      ...buildDocs("WMT", WMT_DESCRIPTIONS, students, 0),
      ...buildDocs("OSSA", OSSA_DESCRIPTIONS, students, WMT_DESCRIPTIONS.length),
    ];

    await KuppiRequest.deleteMany({ id: new RegExp(`^${REQUEST_PREFIX}_(wmt|ossa)_`) });
    await KuppiRequest.insertMany(docs, { ordered: true });

    const totals = await KuppiRequest.aggregate([
      { $match: { id: new RegExp(`^${REQUEST_PREFIX}_(wmt|ossa)_`) } },
      { $group: { _id: "$topic", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log(
      JSON.stringify(
        {
          inserted: docs.length,
          studentUsersUsed: new Set(docs.map((doc) => doc.userId)).size,
          totals,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error("Kuppi request seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

seed();
