import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const LOGO = require("./assets/mydoctor-logo.png");

const FONT_ASSETS = {
  nanumRegular: require("./assets/fonts/NanumSquareRoundR.ttf"),
  nanumBold: require("./assets/fonts/NanumSquareRoundB.ttf"),
  nanumExtraBold: require("./assets/fonts/NanumSquareRoundEB.ttf"),
  montserratRegular: require("./assets/fonts/Montserrat-Regular.ttf"),
  montserratSemiBold: require("./assets/fonts/Montserrat-SemiBold.ttf"),
  montserratBold: require("./assets/fonts/Montserrat-Bold.ttf"),
  montserratExtraBold: require("./assets/fonts/Montserrat-ExtraBold.ttf"),
};

const FONT = {
  koRegular: "NanumSquareRoundR",
  koBold: "NanumSquareRoundB",
  koExtraBold: "NanumSquareRoundEB",
  enRegular: "MontserratRegular",
  enSemiBold: "MontserratSemiBold",
  enBold: "MontserratBold",
  enExtraBold: "MontserratExtraBold",
};

const STORAGE_KEYS = {
  records: "MYDOCTOR_WEB_RECORDS",
  reminders: "MYDOCTOR_WEB_REMINDERS",
  mealTimes: "MYDOCTOR_WEB_MEAL_TIMES",
};

const defaultMealTimes = {
  breakfast: null,
  lunch: null,
  dinner: null,
};

const defaultResult = {
  summary:
    "진료 내용을 입력하거나 약 봉투 사진을 넣으면, 오늘 꼭 기억해야 할 핵심을 쉽게 정리해드립니다.",
  disease:
    "진료 내용을 입력하고 버튼을 누르면, 환자 눈높이에 맞춘 설명이 나옵니다.",
  medicine:
    "처방받은 약을 언제, 어떻게 먹어야 하는지 쉽게 정리해드립니다.",
  caution:
    "생활에서 조심해야 할 점을 환자 눈높이에 맞게 정리해드립니다.",
  hospital:
    "다시 병원에 가야 하는 상황이나 재진 일정을 정리해드립니다.",
};

const medicineTypeLabels = {
  diabetes: "당뇨병 약",
  bloodPressure: "혈압약",
  reflux: "위산·역류성 식도염 약",
  unknown: "복용 약",
};

const mealLabels = {
  breakfast: "아침 식사",
  lunch: "점심 식사",
  dinner: "저녁 식사",
};

const minuteOptions = ["00", "10", "20", "30", "40", "50"];

function getAssetUri(asset) {
  if (typeof asset === "string") return asset;
  if (asset && typeof asset === "object") {
    if (asset.uri) return asset.uri;
    if (asset.default && asset.default.uri) return asset.default.uri;
    if (typeof asset.default === "string") return asset.default;
  }
  return "";
}

function injectWebFonts() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById("mydoctor-font-style")) return;

  const style = document.createElement("style");
  style.id = "mydoctor-font-style";

  const fontFace = (family, asset, weight = "400") => {
    const uri = getAssetUri(asset);
    return `
      @font-face {
        font-family: '${family}';
        src: url('${uri}') format('truetype');
        font-weight: ${weight};
        font-style: normal;
        font-display: swap;
      }
    `;
  };

  style.innerHTML = `
    ${fontFace(FONT.koRegular, FONT_ASSETS.nanumRegular, "400")}
    ${fontFace(FONT.koBold, FONT_ASSETS.nanumBold, "700")}
    ${fontFace(FONT.koExtraBold, FONT_ASSETS.nanumExtraBold, "800")}
    ${fontFace(FONT.enRegular, FONT_ASSETS.montserratRegular, "400")}
    ${fontFace(FONT.enSemiBold, FONT_ASSETS.montserratSemiBold, "600")}
    ${fontFace(FONT.enBold, FONT_ASSETS.montserratBold, "700")}
    ${fontFace(FONT.enExtraBold, FONT_ASSETS.montserratExtraBold, "800")}
    html, body, #root {
      margin: 0;
      min-height: 100%;
      background: #F4F8FB;
      font-family: '${FONT.koBold}', '${FONT.koRegular}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    * {
      box-sizing: border-box;
    }
    input, textarea, button {
      font-family: '${FONT.koBold}', '${FONT.koRegular}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  `;
  document.head.appendChild(style);
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function removeSpaces(text) {
  return normalizeText(text).replace(/\s/g, "");
}

function includesAny(sourceText, keywords) {
  const normal = normalizeText(sourceText);
  const compact = removeSpaces(sourceText);

  return keywords.some((keyword) => {
    const keyNormal = normalizeText(keyword);
    const keyCompact = removeSpaces(keyword);
    return normal.includes(keyNormal) || compact.includes(keyCompact);
  });
}

function detectMedicineType(text = "") {
  const strongDiabetes = [
    "메트포르민",
    "metformin",
    "메트포르민정",
    "metformin",
    "metfor",
    "글루파",
    "글루파정",
    "glupa",
    "glupa850",
    "glup",
    "다이아미크론",
    "다이아미크론엠알",
    "diamicron",
    "diamicron mr",
    "diamicronmr",
    "diami",
    "디아미크론",
    "디아미크론엠알",
    "gliclazide",
    "다이아벡스",
    "diabex",
    "인슐린",
    "insulin",
    "글리메피리드",
    "glimepiride",
    "덱시마",
    "dexima",
    "rosuzet",
    "로수젯",
  ];

  const bloodPressure = [
    "암로디핀",
    "amlodipine",
    "노바스크",
    "losartan",
    "로사르탄",
    "valsartan",
    "발사르탄",
    "telmisartan",
    "텔미사르탄",
    "olmesartan",
    "올메사르탄",
  ];

  const reflux = [
    "오메프라졸",
    "omeprazole",
    "pantoprazole",
    "판토프라졸",
    "esomeprazole",
    "에스오메프라졸",
    "lansoprazole",
    "란소프라졸",
    "rabeprazole",
    "라베프라졸",
    "ppi",
  ];

  if (includesAny(text, strongDiabetes)) return "diabetes";
  if (includesAny(text, bloodPressure)) return "bloodPressure";
  if (includesAny(text, reflux)) return "reflux";

  const weakDiabetes = ["당뇨병", "당뇨약", "혈당 조절", "혈당조절", "diabetes", "glucose"];
  const weakBp = ["고혈압약", "혈압약", "hypertension", "blood pressure"];
  const weakReflux = ["역류성 식도염", "위산 억제", "위산억제", "reflux"];

  const hasMedicineContext = includesAny(text, ["약", "정", "캡슐", "복용", "처방", "tablet", "mg", "병원", "pharm"]);
  if (includesAny(text, weakDiabetes) && hasMedicineContext) return "diabetes";
  if (includesAny(text, weakBp) && hasMedicineContext) return "bloodPressure";
  if (includesAny(text, weakReflux) && hasMedicineContext) return "reflux";

  return "unknown";
}

function getMedicineAnalysisText(type) {
  if (type === "diabetes") {
    return {
      title: "당뇨약 또는 혈당 조절 단서가 확인되었습니다.",
      message:
        "약마다 복용 시간이 다를 수 있습니다. 약 봉투의 복용법을 꼭 확인해주세요. 식은땀, 손떨림, 심한 어지러움은 저혈당 증상일 수 있습니다.",
    };
  }

  if (type === "bloodPressure") {
    return {
      title: "혈압약 관련 단서가 확인되었습니다.",
      message:
        "혈압약은 매일 같은 시간에 꾸준히 드시는 것이 중요합니다. 증상이 없다고 임의로 중단하면 혈압이 다시 올라갈 수 있습니다.",
    };
  }

  if (type === "reflux") {
    return {
      title: "위산 억제제 관련 단서가 확인되었습니다.",
      message:
        "위산을 줄이는 약은 식사 전 복용이 중요한 경우가 많습니다. 정확한 복용법은 약 봉투와 처방전을 확인해주세요.",
    };
  }

  return {
    title: "약 봉투 사진이 첨부되었습니다.",
    message:
      "약 이름과 복용 시간이 잘 보이도록 촬영된 사진이면 복약 설명에 도움이 됩니다. 진료 내용을 함께 입력하면 더 정확히 정리할 수 있습니다.",
  };
}

function generateReminderDrafts(type) {
  if (type === "diabetes") {
    return [
      {
        id: "morning-before",
        label: "아침 식전 30분",
        meal: "breakfast",
        offsetMinutes: -30,
        medicines: ["DiAMiCRON MR", "Dexima"],
        medicineType: "diabetes",
      },
      {
        id: "morning-after",
        label: "아침 식후 30분",
        meal: "breakfast",
        offsetMinutes: 30,
        medicines: ["Rosuzet"],
        medicineType: "diabetes",
      },
      {
        id: "breakfast-dinner-after",
        label: "아침, 저녁 식사 직후",
        meal: "breakfastDinner",
        offsetMinutes: 10,
        medicines: ["GLUPA 850"],
        medicineType: "diabetes",
      },
    ];
  }

  if (type === "bloodPressure") {
    return [
      {
        id: "morning-bp",
        label: "아침 식후 30분",
        meal: "breakfast",
        offsetMinutes: 30,
        medicines: ["혈압약"],
        medicineType: "bloodPressure",
      },
    ];
  }

  if (type === "reflux") {
    return [
      {
        id: "morning-reflux",
        label: "아침 식전 30분",
        meal: "breakfast",
        offsetMinutes: -30,
        medicines: ["위산 억제제"],
        medicineType: "reflux",
      },
    ];
  }

  return [];
}

function parseTime(timeText) {
  if (!timeText) return null;
  const [hourText, minuteText] = String(timeText).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function formatKoreanTime(timeText) {
  const parsed = parseTime(timeText);
  if (!parsed) return "아직 설정하지 않음";
  const period = parsed.hour >= 12 ? "오후" : "오전";
  const hour12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${period} ${hour12}:${String(parsed.minute).padStart(2, "0")}`;
}

function toTimeText(period, hour12, minute) {
  let hour = Number(hour12);
  const min = Number(minute);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function getTimeParts(timeText) {
  const parsed = parseTime(timeText);
  if (!parsed) return { period: "AM", hour12: 8, minute: "00" };
  const period = parsed.hour >= 12 ? "PM" : "AM";
  const hour12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return { period, hour12, minute: String(parsed.minute).padStart(2, "0") };
}

function addMinutesToTime(timeText, offsetMinutes) {
  const parsed = parseTime(timeText);
  if (!parsed) return null;
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  date.setMinutes(date.getMinutes() + offsetMinutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildReminderPlans(drafts, mealTimes) {
  const plans = [];

  drafts.forEach((draft) => {
    const addPlan = (mealKey, suffix = "") => {
      const baseTime = mealTimes[mealKey];
      const timeText = addMinutesToTime(baseTime, draft.offsetMinutes);
      if (!timeText) return;
      plans.push({
        id: `${draft.id}-${mealKey}`,
        label: `${draft.label}${suffix}`,
        timeText,
        medicines: draft.medicines,
        medicineType: draft.medicineType,
        meal: mealKey,
        offsetMinutes: draft.offsetMinutes,
      });
    };

    if (draft.meal === "breakfastDinner") {
      addPlan("breakfast", " · 아침");
      addPlan("dinner", " · 저녁");
    } else {
      addPlan(draft.meal);
    }
  });

  return plans;
}

function getRequiredMeals(drafts) {
  const set = new Set();
  drafts.forEach((draft) => {
    if (draft.meal === "breakfastDinner") {
      set.add("breakfast");
      set.add("dinner");
    } else if (draft.meal) {
      set.add(draft.meal);
    }
  });
  return Array.from(set);
}

function isMealTimesReady(drafts, mealTimes) {
  const required = getRequiredMeals(drafts);
  return required.every((mealKey) => Boolean(mealTimes[mealKey]));
}

function makeRecordTitle(result) {
  const summary = result?.summary || "진료 기록";
  return summary.length > 58 ? summary.slice(0, 58) + "..." : summary;
}

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktopLayout = Platform.OS === "web" && width >= 1000;
  const [desktopSection, setDesktopSection] = useState("dashboard");

  const [activeTab, setActiveTab] = useState("home");
  const [screen, setScreen] = useState("home");

  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState(defaultResult);
  const [isLoading, setIsLoading] = useState(false);

  const [medicinePhotoUri, setMedicinePhotoUri] = useState("");
  const [medicinePhotoName, setMedicinePhotoName] = useState("");
  const [medicinePhotoAnalysis, setMedicinePhotoAnalysis] = useState("");
  const [medicineOcrText, setMedicineOcrText] = useState("");
  const [medicineHintType, setMedicineHintType] = useState("unknown");
  const [ocrProgress, setOcrProgress] = useState("");
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [mealTimes, setMealTimes] = useState(defaultMealTimes);
  const [reminderDrafts, setReminderDrafts] = useState([]);
  const [familyMessage, setFamilyMessage] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedMealKey, setExpandedMealKey] = useState("");
  const [mealDraftValues, setMealDraftValues] = useState({});

  useEffect(() => {
    injectWebFonts();
    loadStoredData();
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    setMealDraftValues({
      breakfast: getTimeParts(mealTimes.breakfast),
      lunch: getTimeParts(mealTimes.lunch),
      dinner: getTimeParts(mealTimes.dinner),
    });
  }, [mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner]);

  const saveRecords = (nextRecords) => {
    setRecords(nextRecords);
    try {
      localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(nextRecords));
    } catch (error) {
      console.log("records save error", error);
    }
  };

  const saveReminders = (nextReminders) => {
    setReminders(nextReminders);
    try {
      localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(nextReminders));
    } catch (error) {
      console.log("reminders save error", error);
    }
  };

  const saveMealTimes = (nextMealTimes) => {
    setMealTimes(nextMealTimes);
    try {
      localStorage.setItem(STORAGE_KEYS.mealTimes, JSON.stringify(nextMealTimes));
    } catch (error) {
      console.log("meal save error", error);
    }
  };

  const loadStoredData = () => {
    if (Platform.OS !== "web" || typeof localStorage === "undefined") return;

    try {
      const recordText = localStorage.getItem(STORAGE_KEYS.records);
      const reminderText = localStorage.getItem(STORAGE_KEYS.reminders);
      const mealText = localStorage.getItem(STORAGE_KEYS.mealTimes);

      if (recordText) setRecords(JSON.parse(recordText));
      if (reminderText) setReminders(JSON.parse(reminderText));
      if (mealText) setMealTimes({ ...defaultMealTimes, ...JSON.parse(mealText) });
    } catch (error) {
      console.log("localStorage load error", error);
    }
  };

  const initializeSpeechRecognition = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setSpeechSupported(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceMessage("이 브라우저에서는 음성 입력을 지원하지 않습니다. 진료 내용을 직접 입력해주세요.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMessage("듣고 있어요. 진료 내용을 편하게 말씀해주세요.");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        setVoiceMessage(`듣고 있어요: ${interimText}`);
      }

      if (finalText.trim()) {
        setUserInput((prev) => (prev.trim() ? `${prev.trim()} ${finalText.trim()}` : finalText.trim()));
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceMessage("음성 입력이 잠시 원활하지 않습니다. 다시 눌러주세요.");
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceMessage("음성 입력이 끝났습니다.");
    };

    recognitionRef.current = recognition;
  };

  const showPopup = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const isMobileBrowser = () => {
    if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
    return /android|iphone|ipad|ipod|windows phone|blackberry|mobile/i.test(
      navigator.userAgent || navigator.vendor || ""
    );
  };

  const clearInputState = () => {
    setUserInput("");
    setResult(defaultResult);
    setIsLoading(false);
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("unknown");
    setOcrProgress("");
    setIsPhotoAnalyzing(false);
    setReminderDrafts([]);
    setFamilyMessage("");
    setEditingRecord(null);
    setVoiceMessage("");
  };

  const handleNewVisit = () => {
    clearInputState();
    setActiveTab("home");
    setScreen("input");
  };

  const handleVoiceInput = (mode = "continue") => {
    if (!speechSupported || !recognitionRef.current) {
      setVoiceMessage("현재 브라우저에서는 음성 입력을 사용할 수 없습니다.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    if (mode === "first") {
      setUserInput("");
      setVoiceMessage("새 진료 내용을 처음부터 듣겠습니다.");
    } else {
      setVoiceMessage("이어서 말씀하시면 기존 내용 뒤에 붙여드립니다.");
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      setVoiceMessage("음성 입력을 다시 시작하려면 잠시 후 눌러주세요.");
    }
  };

  const runMedicineOcr = async (imageUri) => {
    setIsPhotoAnalyzing(true);
    setOcrProgress("약 봉투 사진을 확인하고 있습니다...");
    setMedicineOcrText("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("unknown");

    try {
      const Tesseract = await import("tesseract.js");
      const ocrResult = await Tesseract.recognize(imageUri, "kor+eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(`약 봉투 사진을 확인하고 있습니다... ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const extractedText = ocrResult?.data?.text || "";
      const detectedType = detectMedicineType(extractedText);
      const analysis = getMedicineAnalysisText(detectedType);

      setMedicineOcrText(extractedText.trim());
      setMedicineHintType(detectedType);

      if (detectedType !== "unknown") {
        setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
      } else if (extractedText.trim()) {
        setMedicinePhotoAnalysis(
          "사진에서 글자는 일부 확인되었지만, 약 종류를 특정하기 어렵습니다.\n약 봉투의 약 이름과 복용 시간이 잘 보이도록 다시 촬영하거나 진료 내용을 직접 입력해주세요."
        );
      } else {
        setMedicinePhotoAnalysis(
          "약 봉투 글자를 정확히 읽기 어렵습니다.\n약 이름과 복용 시간이 잘 보이도록 다시 촬영하거나, 진료 내용을 직접 입력해주세요."
        );
      }

      setReminderDrafts(generateReminderDrafts(detectedType));
      setOcrProgress("");
    } catch (error) {
      setMedicineOcrText("");
      setMedicineHintType("unknown");
      setMedicinePhotoAnalysis(
        "웹에서 사진 글자를 읽는 중 오류가 발생했습니다.\n약 이름이나 복용 시간을 직접 입력하면 진료 정리에 함께 반영할 수 있습니다."
      );
      setReminderDrafts(generateReminderDrafts("unknown"));
      setOcrProgress("");
    } finally {
      setIsPhotoAnalyzing(false);
    }
  };

  const processMedicinePhotoFile = (file) => {
    if (!file) return;

    const reader = new FileReader();

    setMedicinePhotoName(file.name || "약 봉투 사진");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("unknown");
    setOcrProgress("");
    setIsPhotoAnalyzing(true);

    reader.onload = () => {
      const imageDataUrl = reader.result;
      setMedicinePhotoUri(imageDataUrl);
      runMedicineOcr(imageDataUrl);
    };

    reader.readAsDataURL(file);
  };

  const openMedicinePhotoInput = (mode) => {
    if (Platform.OS !== "web") {
      showPopup("사진 기능 안내", "웹 버전에서는 브라우저에서 사진을 첨부할 수 있습니다.");
      return;
    }

    if (mode === "camera" && !isMobileBrowser()) {
      showPopup(
        "촬영은 모바일에서 사용할 수 있습니다",
        "노트북에서는 사진 선택을 이용해주세요.\n휴대폰 웹사이트 또는 모바일 앱에서는 약 봉투 촬영을 사용할 수 있습니다."
      );
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    if (mode === "camera") {
      input.capture = "environment";
    }

    input.onchange = (event) => {
      const file = event.target.files && event.target.files[0];
      processMedicinePhotoFile(file);
    };

    input.click();
  };

  const handleRemoveMedicinePhoto = () => {
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("unknown");
    setOcrProgress("");
    setIsPhotoAnalyzing(false);
    setReminderDrafts([]);
  };

  const buildResultByType = (type) => {
    if (type === "diabetes") {
      return {
        summary: "당뇨약 또는 혈당 조절 단서가 확인되었습니다. 약 복용 시간과 식사 시간을 함께 지키는 것이 중요합니다.",
        disease:
          "당뇨병은 혈액 속 포도당, 즉 혈당이 높게 유지되는 병입니다. 혈당이 오래 높으면 눈, 콩팥, 신경, 혈관에 문제가 생길 수 있어 꾸준한 관리가 필요합니다.",
        medicine:
          "당뇨약은 약 종류에 따라 복용 시간이 다를 수 있습니다. 식전, 식후 복용법을 약 봉투에서 꼭 확인해주세요. 식사를 거른 상태에서 약을 먹으면 저혈당이 생길 수 있습니다.",
        caution:
          "식사를 거르지 않고 규칙적으로 드시는 것이 중요합니다. 단 음료나 과도한 간식은 줄이고, 혈당을 기록하면 치료 조절에 도움이 됩니다.",
        hospital:
          "식은땀, 손떨림, 심한 어지러움, 의식이 흐려지는 증상은 저혈당일 수 있습니다. 이런 증상이 반복되거나 혈당이 너무 높게 유지되면 병원에 문의해주세요.",
      };
    }

    if (type === "bloodPressure") {
      return {
        summary: "혈압약 관련 단서가 확인되었습니다. 증상이 없어도 매일 같은 시간에 복용하는 것이 중요합니다.",
        disease:
          "고혈압은 혈관 안의 압력이 계속 높은 상태입니다. 증상이 없어도 오래 지속되면 심장, 뇌혈관, 콩팥에 부담을 줄 수 있습니다.",
        medicine:
          "혈압약은 매일 같은 시간에 꾸준히 드시는 것이 중요합니다. 증상이 없다고 임의로 끊으면 혈압이 다시 올라갈 수 있습니다.",
        caution:
          "짠 음식은 줄이고, 규칙적인 운동과 체중 관리가 도움이 됩니다. 집에서 혈압을 재서 기록하면 진료 때 도움이 됩니다.",
        hospital:
          "심한 두통, 가슴통증, 숨참, 한쪽 팔다리 마비, 말이 어눌해지는 증상이 있으면 바로 진료를 받아야 합니다.",
      };
    }

    if (type === "reflux") {
      return {
        summary: "위산 또는 역류성 식도염 관련 단서가 확인되었습니다. 약 복용 시간과 식습관을 함께 확인하는 것이 중요합니다.",
        disease:
          "역류성 식도염은 위산이나 음식물이 식도로 거꾸로 올라오는 병입니다. 가슴 쓰림이나 신물이 올라오는 증상이 생길 수 있습니다.",
        medicine:
          "위산을 줄이는 약은 식사 전에 복용할 때 효과가 좋은 경우가 많습니다. 정확한 복용 시간은 약 봉투와 처방전을 확인해주세요.",
        caution:
          "매운 음식, 카페인, 기름진 음식, 술은 피하는 것이 좋습니다. 식사 후 바로 눕지 말고, 잠자기 전에는 음식을 줄이는 것이 도움이 됩니다.",
        hospital:
          "증상이 계속되거나 더 심해지면 병원에 다시 방문해야 합니다. 피를 토하거나 검은 변을 보거나 삼키기 힘들면 빨리 진료를 받아야 합니다.",
      };
    }

    if (medicinePhotoUri && !userInput.trim()) {
      return {
        summary: "약 봉투 사진이 첨부되었습니다. 약 이름과 복용법은 약 봉투와 처방전을 함께 확인해주세요.",
        disease:
          "현재는 진료 내용이 입력되지 않아 정확한 병명은 알 수 없습니다. 병명이나 증상을 함께 입력하면 더 구체적인 설명을 받을 수 있습니다.",
        medicine:
          medicinePhotoAnalysis || "약 봉투 사진이 첨부되었습니다. 약 이름, 용량, 복용 시간은 약 봉투와 처방전을 기준으로 확인해야 합니다.",
        caution:
          "사진만으로 약을 임의로 판단하거나 복용법을 바꾸면 안 됩니다. 약 이름이 헷갈리거나 복용 시간을 잊은 경우에는 약국이나 병원에 확인하는 것이 안전합니다.",
        hospital:
          "약을 먹은 뒤 두드러기, 호흡곤란, 심한 어지러움, 입술이나 얼굴이 붓는 증상이 생기면 즉시 진료를 받아야 합니다.",
      };
    }

    return {
      summary: "입력하신 진료 내용을 바탕으로 정리했습니다. 정확한 내용은 처방전과 의료진 설명을 함께 확인해주세요.",
      disease:
        "현재 증상과 의사 선생님의 설명을 쉽게 정리해 이해하는 것이 중요합니다. 정확한 진단명은 의료진의 설명과 처방전을 함께 확인해주세요.",
      medicine:
        medicinePhotoAnalysis ||
        "약은 처방받은 용법과 용량에 맞춰 복용해야 합니다. 식전, 식후, 자기 전 등 복용 시간이 다를 수 있으므로 약 봉투나 처방전을 꼭 확인해주세요.",
      caution:
        "생활습관 관리나 음식 조절에 대한 설명을 들었다면 잘 지키는 것이 좋습니다. 증상이 갑자기 심해지거나 평소와 다른 증상이 생기면 병원에 문의해주세요.",
      hospital:
        "호흡곤란, 심한 통증, 고열, 의식 저하, 심한 알레르기 반응이 생기면 바로 병원에 문의해야 합니다. 재진 일정이 안내되었다면 꼭 지켜주세요.",
    };
  };

  const handleTranslate = () => {
    if (!userInput.trim() && !medicinePhotoUri) {
      showPopup("입력 필요", "진료 내용 또는 약 봉투 사진을 먼저 넣어주세요.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const finalType =
        medicineHintType !== "unknown"
          ? medicineHintType
          : detectMedicineType(`${userInput} ${medicineOcrText}`);

      setResult(buildResultByType(finalType));
      setReminderDrafts(generateReminderDrafts(finalType));
      setIsLoading(false);
      setActiveTab("home");
      setScreen("result");
    }, 550);
  };

  const saveCurrentRecord = () => {
    const newRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      input: userInput,
      result,
      medicinePhotoUri,
      medicinePhotoName,
      medicinePhotoAnalysis,
      medicineOcrText,
      medicineHintType,
    };

    saveRecords([newRecord, ...records]);
    showPopup("저장 완료", "진료 기록이 저장되었습니다.");
  };

  const openRecord = (record) => {
    setEditingRecord(record);
    setUserInput(record.input || "");
    setResult(record.result || defaultResult);
    setMedicinePhotoUri(record.medicinePhotoUri || "");
    setMedicinePhotoName(record.medicinePhotoName || "");
    setMedicinePhotoAnalysis(record.medicinePhotoAnalysis || "");
    setMedicineOcrText(record.medicineOcrText || "");
    setMedicineHintType(record.medicineHintType || "unknown");
    setReminderDrafts(generateReminderDrafts(record.medicineHintType || "unknown"));
    setActiveTab("home");
    setScreen("result");
  };

  const deleteRecord = (recordId) => {
    const ok = Platform.OS === "web" ? window.confirm("이 진료 기록을 삭제할까요?") : true;
    if (!ok) return;
    saveRecords(records.filter((item) => item.id !== recordId));
  };

  const buildFamilyMessage = () => {
    return `[진료 내용 요약]

오늘의 핵심:
${result.summary}

1. 무슨 병인가요?
${result.disease}

2. 약은 어떻게 먹어야 하나요?
${result.medicine}

3. 무엇을 조심해야 하나요?
${result.caution}

4. 언제 다시 병원에 가야 하나요?
${result.hospital}

※ 이 내용은 진료 내용을 쉽게 정리한 보조 설명이며, 정확한 내용은 처방전과 의료진 설명을 함께 확인해주세요.`;
  };

  const handleNotifyFamily = async () => {
    const message = buildFamilyMessage();
    setFamilyMessage(message);
    setScreen("share");
    setActiveTab("home");

    try {
      if (Platform.OS === "web" && navigator.share) {
        await navigator.share({ title: "진료 내용 요약", text: message });
      } else if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        showPopup("복사 완료", "보호자에게 보낼 요약문이 복사되었습니다.");
      }
    } catch (error) {
      console.log("share error", error);
    }
  };

  const saveMealTimeFromDraft = (mealKey) => {
    const draft = mealDraftValues[mealKey] || getTimeParts(mealTimes[mealKey]);
    const nextMealTimes = {
      ...mealTimes,
      [mealKey]: toTimeText(draft.period, draft.hour12, draft.minute),
    };
    saveMealTimes(nextMealTimes);
    rescheduleRemindersWithMealTimes(nextMealTimes);
    setExpandedMealKey("");
  };

  const rescheduleRemindersWithMealTimes = (nextMealTimes) => {
    const nextReminders = reminders.map((item) => {
      const timeText = addMinutesToTime(nextMealTimes[item.meal], item.offsetMinutes) || item.timeText;
      return { ...item, timeText };
    });
    saveReminders(nextReminders);
  };

  const saveReminderPlans = () => {
    if (!isMealTimesReady(reminderDrafts, mealTimes)) {
      showPopup(
        "식사 시간이 필요합니다",
        "약 알림 시간을 계산하려면 평소 식사 시간을 먼저 알려주세요.\n아래에서 아침, 점심, 저녁 식사 시간을 설정한 뒤 다시 저장해주세요."
      );
      return;
    }

    const plans = buildReminderPlans(reminderDrafts, mealTimes).map((plan, index) => ({
      ...plan,
      id: `web-reminder-${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
    }));

    saveReminders([...plans, ...reminders]);
    showPopup(
      "알림 저장 완료",
      "웹에서는 복용 시간을 저장하고 확인할 수 있습니다.\n실제 푸시 알림은 모바일 앱에서 사용할 수 있습니다."
    );
    setScreen("result");
    setActiveTab("home");
  };

  const deleteReminder = (id) => {
    const ok = Platform.OS === "web" ? window.confirm("이 약 알림을 삭제할까요?") : true;
    if (!ok) return;
    saveReminders(reminders.filter((item) => item.id !== id));
  };

  const openReminderSetup = () => {
    const finalType =
      medicineHintType !== "unknown" ? medicineHintType : detectMedicineType(`${userInput} ${medicineOcrText}`);
    const drafts = generateReminderDrafts(finalType);

    if (!drafts.length) {
      showPopup(
        "약 종류를 확인하기 어렵습니다",
        "약 알림을 만들려면 약 이름이나 복용 시간이 필요합니다. 약 봉투 글자가 잘 보이도록 다시 촬영하거나, 진료 내용에 약 이름을 직접 입력해주세요."
      );
      return;
    }

    setReminderDrafts(drafts);
    setScreen("reminderSetup");
    setActiveTab("home");
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const renderTopBar = (title, backTarget) => {
    return (
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => {
            if (backTarget === "tab-home") {
              setActiveTab("home");
              setScreen("home");
            } else {
              setScreen(backTarget || "home");
            }
          }}
        >
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>

        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.topBarSubtitle} numberOfLines={1}>
            MyDoctor Web
          </Text>
        </View>

        <TouchableOpacity style={styles.logoMini} onPress={() => {
          clearInputState();
          setActiveTab("home");
          setScreen("home");
        }}>
          <Image source={LOGO} style={styles.logoMiniImage} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderBottomTabs = () => {
    const tabs = [
      { key: "home", label: "홈", icon: "🏠" },
      { key: "records", label: "기록", icon: "📋" },
      { key: "reminders", label: "약 알림", icon: "💊" },
      { key: "settings", label: "설정", icon: "⚙️" },
    ];

    return (
      <View style={styles.bottomTabs}>
        {tabs.map((tab) => {
          const focused = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, focused && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab(tab.key);
                setScreen(tab.key);
              }}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderHomeScreen = () => {
    return (
      <View style={styles.appScreen}>
        <ScrollView contentContainerStyle={styles.homeWrap}>
          <Image source={LOGO} style={styles.homeLogoImage} resizeMode="contain" />

          <Text style={styles.homeMainText}>
            진료실에서 들은 어려운 말을{"\n"}쉽게 정리해드려요
          </Text>

          <View style={styles.homeFeatureBox}>
            <Text style={styles.homeFeatureTitle}>이 앱으로 할 수 있는 일</Text>
            <Text style={styles.homeFeatureText}>✓ 어려운 진료 내용을 쉽게 보기</Text>
            <Text style={styles.homeFeatureText}>✓ 가족에게 요약문 보내기</Text>
            <Text style={styles.homeFeatureText}>✓ 약 알림 시간 설정하기</Text>
            <Text style={styles.homeFeatureText}>✓ 진료 기록 다시 확인하기</Text>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={handleNewVisit}>
            <Text style={styles.startButtonText}>새 진료 정리하기</Text>
          </TouchableOpacity>

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                setActiveTab("records");
                setScreen("records");
              }}
            >
              <Text style={styles.quickButtonText}>기록 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                setActiveTab("reminders");
                setScreen("reminders");
              }}
            >
              <Text style={styles.quickButtonText}>약 알림 보기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderInputScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("진료 내용 입력", "home")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>진료 내용을 적어주세요</Text>
            <Text style={styles.sectionDescription}>
              병원에서 들은 말이나 약 이름을 짧게 적어도 됩니다.
            </Text>

            <TextInput
              style={styles.textArea}
              multiline
              textAlignVertical="top"
              value={userInput}
              onChangeText={setUserInput}
              placeholder="예: 당뇨 때문에 병원에 갔고 약을 받았어요. 식후에 먹으라고 하셨어요."
              placeholderTextColor="#6B7C8D"
            />

            <View style={styles.voiceButtonColumn}>
              <View style={styles.photoButtonRow}>
                <TouchableOpacity
                  style={[styles.photoButton, isListening && styles.listeningButton]}
                  onPress={() => handleVoiceInput("first")}
                >
                  <Text style={styles.photoButtonText}>{isListening ? "🔴 듣고 있어요" : "🎤 처음 말하기"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoButton, isListening && styles.listeningButton]}
                  onPress={() => handleVoiceInput("continue")}
                >
                  <Text style={styles.photoButtonText}>➕ 이어 말하기</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.clearButton} onPress={clearInputState}>
                <Text style={styles.clearButtonText}>입력 지우기</Text>
              </TouchableOpacity>
            </View>

            {voiceMessage ? <Text style={styles.voiceMessage}>{voiceMessage}</Text> : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>약 봉투 사진을 넣어주세요</Text>
            <Text style={styles.sectionDescription}>
              모바일 웹에서는 촬영할 수 있고, 노트북에서는 사진 선택을 이용할 수 있습니다.
            </Text>

            <View style={styles.photoButtonRow}>
              <TouchableOpacity style={styles.photoButton} onPress={() => openMedicinePhotoInput("gallery")}>
                <Text style={styles.photoButtonText}>🖼️ 사진 선택</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={() => openMedicinePhotoInput("camera")}>
                <Text style={styles.photoButtonText}>📷 촬영하기</Text>
              </TouchableOpacity>
            </View>

            {medicinePhotoUri ? (
              <View style={styles.photoPreviewBox}>
                <View style={styles.photoPreviewHeader}>
                  <Text style={styles.photoPreviewTitle}>첨부된 약 봉투 사진</Text>
                  <TouchableOpacity onPress={handleRemoveMedicinePhoto}>
                    <Text style={styles.photoRemoveText}>삭제</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.medicineImageFrame}>
                  <Image source={{ uri: medicinePhotoUri }} style={styles.medicineImage} resizeMode="contain" />
                </View>

                {isPhotoAnalyzing || ocrProgress ? (
                  <Text style={styles.photoAnalysisText}>{ocrProgress || "약 봉투 사진을 확인하고 있습니다..."}</Text>
                ) : medicinePhotoAnalysis ? (
                  <Text style={styles.photoAnalysisText}>{medicinePhotoAnalysis}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyPhotoBox}>
                <Text style={styles.emptyPhotoIcon}>📄</Text>
                <Text style={styles.emptyPhotoText}>약 봉투 사진을 넣으면{"\n"}진료 설명에 함께 반영됩니다.</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={[styles.mainButton, isLoading && styles.loadingButton]} onPress={handleTranslate}>
            <Text style={styles.mainButtonText}>{isLoading ? "진료 내용을 정리하고 있습니다" : "AI로 쉽게 정리하기"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderResultScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("쉬운 설명 카드", "input")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          {editingRecord ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>저장된 진료 기록을 다시 보고 있습니다.</Text>
            </View>
          ) : null}

          {editingRecord ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>당시 입력한 내용</Text>
              <Text style={styles.sectionDescription}>{editingRecord.input || "입력 내용이 없습니다."}</Text>
              {editingRecord.medicinePhotoUri ? (
                <View style={styles.medicineImageFrame}>
                  <Image source={{ uri: editingRecord.medicinePhotoUri }} style={styles.medicineImage} resizeMode="contain" />
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>💡 오늘 꼭 기억할 내용</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </View>

          <InfoCard icon="📋" title="무슨 병인가요?" text={result.disease} />
          <InfoCard icon="💊" title="약은 어떻게 먹나요?" text={result.medicine} />
          <InfoCard icon="⚠️" title="무엇을 조심하나요?" text={result.caution} />
          <InfoCard icon="🏥" title="언제 병원에 다시 가나요?" text={result.hospital} />

          <View style={styles.actionPanel}>
            <TouchableOpacity style={styles.familyButton} onPress={handleNotifyFamily}>
              <Text style={styles.familyButtonText}>가족에게 알리기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.alarmButton} onPress={openReminderSetup}>
              <Text style={styles.alarmButtonText}>약 알림 설정</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveCurrentRecord}>
            <Text style={styles.saveButtonText}>진료 기록 저장하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderMealEditor = (mealKey) => {
    const draft = mealDraftValues[mealKey] || getTimeParts(mealTimes[mealKey]);

    return (
      <View style={styles.mealEditorBox}>
        <TouchableOpacity
          style={styles.mealToggleButton}
          onPress={() => setExpandedMealKey(expandedMealKey === mealKey ? "" : mealKey)}
        >
          <View>
            <Text style={styles.mealInputLabel}>{mealLabels[mealKey]}</Text>
            <Text style={styles.mealCurrentText}>{formatKoreanTime(mealTimes[mealKey])}</Text>
          </View>
          <Text style={styles.mealToggleText}>{expandedMealKey === mealKey ? "접기" : "변경"}</Text>
        </TouchableOpacity>

        {expandedMealKey === mealKey ? (
          <View style={styles.timePickerPanel}>
            <View style={styles.segmentRow}>
              {[
                ["AM", "오전"],
                ["PM", "오후"],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.segmentButton, draft.period === value && styles.segmentButtonActive]}
                  onPress={() =>
                    setMealDraftValues({
                      ...mealDraftValues,
                      [mealKey]: { ...draft, period: value },
                    })
                  }
                >
                  <Text style={[styles.segmentButtonText, draft.period === value && styles.segmentButtonTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.timePickerLabel}>시간</Text>
            <View style={styles.optionGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.timeOption, draft.hour12 === hour && styles.timeOptionActive]}
                  onPress={() =>
                    setMealDraftValues({
                      ...mealDraftValues,
                      [mealKey]: { ...draft, hour12: hour },
                    })
                  }
                >
                  <Text style={[styles.timeOptionText, draft.hour12 === hour && styles.timeOptionTextActive]}>
                    {hour}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.timePickerLabel}>분</Text>
            <View style={styles.optionGrid}>
              {minuteOptions.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[styles.timeOption, draft.minute === minute && styles.timeOptionActive]}
                  onPress={() =>
                    setMealDraftValues({
                      ...mealDraftValues,
                      [mealKey]: { ...draft, minute },
                    })
                  }
                >
                  <Text style={[styles.timeOptionText, draft.minute === minute && styles.timeOptionTextActive]}>
                    {minute}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.smallSaveButton} onPress={() => saveMealTimeFromDraft(mealKey)}>
              <Text style={styles.smallSaveButtonText}>시간 저장하기</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderReminderSetupScreen = () => {
    const plans = buildReminderPlans(reminderDrafts, mealTimes);
    const requiredMeals = getRequiredMeals(reminderDrafts);

    return (
      <View style={styles.appScreen}>
        {renderTopBar("약 알림 설정", "result")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>AI가 알림을 준비했습니다</Text>
            <Text style={styles.sectionDescription}>복용 시간은 약 봉투와 한 번 더 확인해주세요.</Text>

            {reminderDrafts.map((draft) => (
              <View key={draft.id} style={styles.draftCard}>
                <Text style={styles.draftTypeLabel}>{medicineTypeLabels[draft.medicineType || "unknown"]}</Text>
                <Text style={styles.draftTitle}>{draft.label}</Text>
                {draft.medicines.map((med) => (
                  <Text key={med} style={styles.draftMedicine}>- {med}</Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>식사 시간을 알려주세요</Text>
            <Text style={styles.sectionDescription}>
              아침, 점심, 저녁 식사 시간을 한 번에 설정해두면 복용 시간이 자동으로 계산됩니다.
            </Text>
            {["breakfast", "lunch", "dinner"].map((mealKey) => (
              <View key={mealKey}>{renderMealEditor(mealKey)}</View>
            ))}
          </View>

          {plans.length ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>저장될 알림</Text>
              {plans.map((plan) => (
                <View key={plan.id} style={styles.planRow}>
                  <Text style={styles.planTime}>{formatKoreanTime(plan.timeText)}</Text>
                  <View style={styles.planTextBox}>
                    <Text style={styles.planTitle}>{plan.label}</Text>
                    <Text style={styles.planBody}>{medicineTypeLabels[plan.medicineType || "unknown"]} · {plan.medicines.join(", ")}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>식사 시간을 설정하면 저장될 알림 시간이 여기에 표시됩니다.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.mainButton} onPress={saveReminderPlans}>
            <Text style={styles.mainButtonText}>알림 저장하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={() => setScreen("result")}>
            <Text style={styles.saveButtonText}>설정하지 않고 설명 카드로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderRecordsScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("진료 기록", "tab-home")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          {records.length === 0 ? (
            <EmptyState icon="📋" title="저장된 기록이 없습니다" text="진료 내용을 정리한 뒤 기록 저장하기를 눌러주세요." />
          ) : (
            records.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <Text style={styles.recordDate}>{formatDate(record.createdAt)}</Text>
                <Text style={styles.recordTitle}>{makeRecordTitle(record.result)}</Text>
                <View style={styles.recordButtonRow}>
                  <TouchableOpacity style={styles.recordOpenButton} onPress={() => openRecord(record)}>
                    <Text style={styles.recordOpenText}>다시 보기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.recordDeleteButton} onPress={() => deleteRecord(record.id)}>
                    <Text style={styles.recordDeleteText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderRemindersScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("약 알림 관리", "tab-home")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              웹에서는 복용 시간을 저장하고 확인할 수 있습니다. 실제 푸시 알림은 모바일 앱에서 사용할 수 있습니다.
            </Text>
          </View>

          {reminders.length === 0 ? (
            <EmptyState icon="💊" title="저장된 약 알림이 없습니다" text="쉬운 설명 카드에서 약 알림 설정을 눌러 알림을 만들 수 있습니다." />
          ) : (
            reminders.map((item) => (
              <View key={item.id} style={styles.reminderCard}>
                <Text style={styles.reminderTime}>{formatKoreanTime(item.timeText)}</Text>
                <Text style={styles.reminderTitle}>{item.label}</Text>
                <Text style={styles.reminderBody}>{medicineTypeLabels[item.medicineType || "unknown"]} · {item.medicines.join(", ")}</Text>
                <TouchableOpacity style={styles.recordDeleteButton} onPress={() => deleteReminder(item.id)}>
                  <Text style={styles.recordDeleteText}>알림 삭제</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderSettingsScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("설정", "tab-home")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>기본 식사 시간</Text>
            <Text style={styles.sectionDescription}>식사 시간이 바뀌면 여기에서 수정할 수 있습니다.</Text>
            {["breakfast", "lunch", "dinner"].map((mealKey) => (
              <View key={mealKey}>{renderMealEditor(mealKey)}</View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>앱 정보</Text>
            <Text style={styles.sectionDescription}>
              마이닥터 웹은 진료 내용을 쉽게 정리하고, 기록과 복용 시간을 확인할 수 있도록 돕는 웹앱입니다. 모바일 앱에서는 실제 푸시 알림까지 사용할 수 있습니다.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderShareScreen = () => {
    const message = familyMessage || buildFamilyMessage();

    return (
      <View style={styles.appScreen}>
        {renderTopBar("보호자에게 보내기", "result")}
        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.familyMessageBox}>
            <Text style={styles.familyMessageTitle}>보호자용 요약문</Text>
            <Text style={styles.familyMessageText}>{message}</Text>
          </View>
          <TouchableOpacity style={styles.familyButtonLarge} onPress={handleNotifyFamily}>
            <Text style={styles.familyButtonText}>공유하기 / 다시 보내기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={() => setScreen("result")}>
            <Text style={styles.saveButtonText}>설명 카드로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };


  const desktopMenuItems = [
    { key: "dashboard", label: "홈", icon: "🏠", description: "마이닥터 시작" },
    { key: "workspace", label: "새 진료 정리", icon: "🩺", description: "입력·분석" },
    { key: "records", label: "진료 기록", icon: "📋", description: `${records.length}개 저장됨` },
    { key: "reminders", label: "약 알림", icon: "💊", description: `${reminders.length}개 저장됨` },
    { key: "settings", label: "설정", icon: "⚙️", description: "식사 시간 관리" },
  ];

  const openDesktopSection = (key) => {
    setDesktopSection(key);
    if (key === "dashboard") {
      setScreen("home");
      setActiveTab("home");
    }
    if (key === "workspace") {
      if (screen !== "result" && screen !== "reminderSetup" && screen !== "share") {
        setScreen("input");
      }
      setActiveTab("home");
    }
    if (key === "records") {
      setActiveTab("records");
      setScreen("records");
    }
    if (key === "reminders") {
      setActiveTab("reminders");
      setScreen("reminders");
    }
    if (key === "settings") {
      setActiveTab("settings");
      setScreen("settings");
    }
  };

  const handleDesktopNewVisit = () => {
    handleNewVisit();
    setDesktopSection("workspace");
  };

  const handleDesktopOpenRecord = (record) => {
    openRecord(record);
    setDesktopSection("workspace");
  };

  const handleDesktopReminderSetup = () => {
    openReminderSetup();
    setDesktopSection("workspace");
  };

  const renderDesktopSidebar = () => {
    return (
      <View style={styles.desktopSidebar}>
        <View style={styles.desktopBrandBox}>
          <Image source={LOGO} style={styles.desktopLogo} resizeMode="contain" />
          <Text style={styles.desktopBrandText}>MyDoctor</Text>
          <Text style={styles.desktopBrandSub}>AI 진료 설명·복약 관리</Text>
        </View>

        <View style={styles.desktopMenuList}>
          {desktopMenuItems.map((item) => {
            const focused = desktopSection === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.desktopMenuButton, focused && styles.desktopMenuButtonActive]}
                onPress={() => openDesktopSection(item.key)}
              >
                <Text style={styles.desktopMenuIcon}>{item.icon}</Text>
                <View style={styles.desktopMenuTextBox}>
                  <Text style={[styles.desktopMenuLabel, focused && styles.desktopMenuLabelActive]}>{item.label}</Text>
                  <Text style={[styles.desktopMenuDescription, focused && styles.desktopMenuDescriptionActive]}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.desktopSideNotice}>
          <Text style={styles.desktopSideNoticeTitle}>웹에서 바로 사용하는 마이닥터</Text>
          <Text style={styles.desktopSideNoticeText}>PC에서는 넓은 화면으로 진료 정리, 기록, 약 알림을 한 번에 관리할 수 있습니다.</Text>
        </View>
      </View>
    );
  };

  const renderDesktopHero = () => {
    return (
      <View style={styles.desktopHeroGrid}>
        <View style={styles.desktopHeroCard}>
          <Text style={styles.desktopEyebrow}>MYDOCTOR WEB</Text>
          <Text style={styles.desktopHeroTitle}>진료실에서 들은 어려운 말을{"\n"}웹에서도 쉽게 정리해드려요</Text>
          <Text style={styles.desktopHeroText}>
            마이닥터 PC 웹은 진료 내용, 약 봉투 사진, 음성 입력을 한 화면에서 정리하고 기록과 복용 시간을 함께 관리하는 데스크톱 웹 서비스입니다.
          </Text>
          <View style={styles.desktopHeroButtonRow}>
            <TouchableOpacity style={styles.desktopPrimaryButton} onPress={handleDesktopNewVisit}>
              <Text style={styles.desktopPrimaryButtonText}>새 진료 정리하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.desktopSecondaryButton} onPress={() => openDesktopSection("records")}>
              <Text style={styles.desktopSecondaryButtonText}>기록 확인하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.desktopStatusCard}>
          <Text style={styles.desktopPanelTitle}>오늘의 마이닥터</Text>
          <View style={styles.desktopStatRow}>
            <View style={styles.desktopStatBox}>
              <Text style={styles.desktopStatNumber}>{records.length}</Text>
              <Text style={styles.desktopStatLabel}>진료 기록</Text>
            </View>
            <View style={styles.desktopStatBox}>
              <Text style={styles.desktopStatNumber}>{reminders.length}</Text>
              <Text style={styles.desktopStatLabel}>약 알림</Text>
            </View>
          </View>
          <View style={styles.desktopMiniFeatureList}>
            <Text style={styles.desktopMiniFeature}>✓ 어려운 진료 내용을 쉽게 보기</Text>
            <Text style={styles.desktopMiniFeature}>✓ 가족에게 요약문 보내기</Text>
            <Text style={styles.desktopMiniFeature}>✓ 약 알림 시간 설정하기</Text>
            <Text style={styles.desktopMiniFeature}>✓ 진료 기록 다시 확인하기</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDesktopDashboard = () => {
    const latestRecord = records[0];
    const upcomingReminder = reminders[0];
    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        {renderDesktopHero()}

        <View style={styles.desktopThreeColumn}>
          <TouchableOpacity style={styles.desktopActionCard} onPress={handleDesktopNewVisit}>
            <Text style={styles.desktopActionIcon}>🩺</Text>
            <Text style={styles.desktopActionTitle}>새 진료 정리</Text>
            <Text style={styles.desktopActionText}>진료 내용, 약 봉투 사진, 음성 입력을 한 번에 정리합니다.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.desktopActionCard} onPress={() => openDesktopSection("records")}>
            <Text style={styles.desktopActionIcon}>📋</Text>
            <Text style={styles.desktopActionTitle}>진료 기록</Text>
            <Text style={styles.desktopActionText}>{latestRecord ? makeRecordTitle(latestRecord.result) : "저장된 진료 기록을 다시 확인합니다."}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.desktopActionCard} onPress={() => openDesktopSection("reminders")}>
            <Text style={styles.desktopActionIcon}>💊</Text>
            <Text style={styles.desktopActionTitle}>약 알림 관리</Text>
            <Text style={styles.desktopActionText}>{upcomingReminder ? `${formatKoreanTime(upcomingReminder.timeText)} · ${upcomingReminder.label}` : "식사 시간에 맞춘 복용 시간을 관리합니다."}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.desktopInfoGrid}>
          <View style={styles.desktopInfoPanel}>
            <Text style={styles.desktopPanelTitle}>마이닥터 사용 흐름</Text>
            <Text style={styles.desktopStepText}>1. 진료 내용을 입력하거나 약 봉투 사진을 올립니다.</Text>
            <Text style={styles.desktopStepText}>2. AI가 환자 눈높이에 맞춰 쉬운 설명 카드로 정리합니다.</Text>
            <Text style={styles.desktopStepText}>3. 보호자에게 요약문을 보내고, 기록과 복용 시간을 저장합니다.</Text>
          </View>
          <View style={styles.desktopInfoPanel}>
            <Text style={styles.desktopPanelTitle}>PC 웹에서 가능한 기능</Text>
            <Text style={styles.desktopStepText}>• 약 봉투 사진 OCR 분석</Text>
            <Text style={styles.desktopStepText}>• 웹 음성 입력</Text>
            <Text style={styles.desktopStepText}>• 진료 기록 저장과 다시 보기</Text>
            <Text style={styles.desktopStepText}>• 약 알림 시간 계산과 관리</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDesktopInputPanel = () => {
    return (
      <View style={styles.desktopPanelCard}>
        <Text style={styles.desktopPanelTitle}>진료 내용 입력</Text>
        <Text style={styles.desktopPanelDescription}>병원에서 들은 말이나 약 이름을 짧게 적어도 됩니다.</Text>
        <TextInput
          style={styles.desktopTextArea}
          multiline
          textAlignVertical="top"
          value={userInput}
          onChangeText={setUserInput}
          placeholder="예: 당뇨 때문에 병원에 갔고 약을 받았어요. 식후에 먹으라고 하셨어요."
          placeholderTextColor="#6B7C8D"
        />
        <View style={styles.desktopButtonRow}>
          <TouchableOpacity style={[styles.desktopSmallButton, isListening && styles.listeningButton]} onPress={() => handleVoiceInput("first")}>
            <Text style={styles.desktopSmallButtonText}>{isListening ? "🔴 듣고 있어요" : "🎤 처음 말하기"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.desktopSmallButton, isListening && styles.listeningButton]} onPress={() => handleVoiceInput("continue")}>
            <Text style={styles.desktopSmallButtonText}>➕ 이어 말하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.desktopClearButton} onPress={clearInputState}>
            <Text style={styles.desktopClearButtonText}>입력 지우기</Text>
          </TouchableOpacity>
        </View>
        {voiceMessage ? <Text style={styles.voiceMessage}>{voiceMessage}</Text> : null}

        <View style={styles.desktopDivider} />

        <Text style={styles.desktopPanelTitle}>약 봉투 사진</Text>
        <Text style={styles.desktopPanelDescription}>PC에서는 사진을 업로드하고, 모바일 웹에서는 카메라 촬영도 사용할 수 있습니다.</Text>
        <View style={styles.desktopButtonRow}>
          <TouchableOpacity style={styles.desktopSmallButton} onPress={() => openMedicinePhotoInput("gallery")}>
            <Text style={styles.desktopSmallButtonText}>🖼️ 사진 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.desktopSmallButton} onPress={() => openMedicinePhotoInput("camera")}>
            <Text style={styles.desktopSmallButtonText}>📷 촬영하기</Text>
          </TouchableOpacity>
        </View>

        {medicinePhotoUri ? (
          <View style={styles.desktopPhotoRow}>
            <Image source={{ uri: medicinePhotoUri }} style={styles.desktopMedicineImage} resizeMode="contain" />
            <View style={styles.desktopPhotoTextBox}>
              <View style={styles.photoPreviewHeader}>
                <Text style={styles.photoPreviewTitle}>첨부된 약 봉투 사진</Text>
                <TouchableOpacity onPress={handleRemoveMedicinePhoto}>
                  <Text style={styles.photoRemoveText}>삭제</Text>
                </TouchableOpacity>
              </View>
              {isPhotoAnalyzing || ocrProgress ? (
                <Text style={styles.photoAnalysisText}>{ocrProgress || "약 봉투 사진을 확인하고 있습니다..."}</Text>
              ) : medicinePhotoAnalysis ? (
                <Text style={styles.photoAnalysisText}>{medicinePhotoAnalysis}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.desktopEmptyPhotoBox}>
            <Text style={styles.emptyPhotoIcon}>📄</Text>
            <Text style={styles.emptyPhotoText}>약 봉투 사진을 넣으면 진료 설명에 함께 반영됩니다.</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.mainButton, isLoading && styles.loadingButton]} onPress={handleTranslate}>
          <Text style={styles.mainButtonText}>{isLoading ? "진료 내용을 정리하고 있습니다" : "AI로 쉽게 정리하기"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDesktopResultPanel = () => {
    return (
      <View style={styles.desktopPanelCard}>
        <Text style={styles.desktopPanelTitle}>AI 쉬운 설명 카드</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>💡 오늘 꼭 기억할 내용</Text>
          <Text style={styles.summaryText}>{result.summary}</Text>
        </View>
        <InfoCard icon="📋" title="무슨 병인가요?" text={result.disease} />
        <InfoCard icon="💊" title="약은 어떻게 먹나요?" text={result.medicine} />
        <InfoCard icon="⚠️" title="무엇을 조심하나요?" text={result.caution} />
        <InfoCard icon="🏥" title="언제 병원에 다시 가나요?" text={result.hospital} />
        <View style={styles.desktopButtonRow}>
          <TouchableOpacity style={styles.familyButton} onPress={handleNotifyFamily}>
            <Text style={styles.familyButtonText}>가족에게 알리기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.alarmButton} onPress={handleDesktopReminderSetup}>
            <Text style={styles.alarmButtonText}>약 알림 설정</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={saveCurrentRecord}>
          <Text style={styles.saveButtonText}>진료 기록 저장하기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDesktopReminderSetup = () => {
    const plans = buildReminderPlans(reminderDrafts, mealTimes);
    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        <View style={styles.desktopWorkspaceGrid}>
          <View style={styles.desktopPanelCard}>
            <Text style={styles.desktopPanelTitle}>약 알림 설정</Text>
            <Text style={styles.desktopPanelDescription}>복용 시간은 약 봉투와 한 번 더 확인해주세요.</Text>
            {reminderDrafts.map((draft) => (
              <View key={draft.id} style={styles.draftCard}>
                <Text style={styles.draftTypeLabel}>{medicineTypeLabels[draft.medicineType || "unknown"]}</Text>
                <Text style={styles.draftTitle}>{draft.label}</Text>
                {draft.medicines.map((med) => (
                  <Text key={med} style={styles.draftMedicine}>- {med}</Text>
                ))}
              </View>
            ))}
          </View>
          <View style={styles.desktopPanelCard}>
            <Text style={styles.desktopPanelTitle}>식사 시간과 저장될 알림</Text>
            {['breakfast', 'lunch', 'dinner'].map((mealKey) => (
              <View key={mealKey}>{renderMealEditor(mealKey)}</View>
            ))}
            {plans.length ? (
              <View style={styles.desktopPlanBox}>
                {plans.map((plan) => (
                  <View key={plan.id} style={styles.planRow}>
                    <Text style={styles.planTime}>{formatKoreanTime(plan.timeText)}</Text>
                    <View style={styles.planTextBox}>
                      <Text style={styles.planTitle}>{plan.label}</Text>
                      <Text style={styles.planBody}>{medicineTypeLabels[plan.medicineType || "unknown"]} · {plan.medicines.join(", ")}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>식사 시간을 설정하면 저장될 알림 시간이 여기에 표시됩니다.</Text>
              </View>
            )}
            <TouchableOpacity style={styles.mainButton} onPress={saveReminderPlans}>
              <Text style={styles.mainButtonText}>알림 저장하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.desktopSecondaryButton} onPress={() => setScreen("result")}>
              <Text style={styles.desktopSecondaryButtonText}>설정하지 않고 설명 카드로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDesktopWorkspace = () => {
    if (screen === "reminderSetup") return renderDesktopReminderSetup();
    if (screen === "share") return renderDesktopShare();

    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        <View style={styles.desktopWorkspaceHeader}>
          <View>
            <Text style={styles.desktopPageTitle}>새 진료 정리</Text>
            <Text style={styles.desktopPageSubtitle}>진료 내용 입력부터 설명 카드, 약 알림 설정까지 한 화면에서 진행합니다.</Text>
          </View>
          <TouchableOpacity style={styles.desktopSecondaryButton} onPress={handleDesktopNewVisit}>
            <Text style={styles.desktopSecondaryButtonText}>새로 시작</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.desktopWorkspaceGrid}>
          {renderDesktopInputPanel()}
          {renderDesktopResultPanel()}
        </View>
      </ScrollView>
    );
  };

  const renderDesktopRecords = () => {
    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        <Text style={styles.desktopPageTitle}>진료 기록</Text>
        <Text style={styles.desktopPageSubtitle}>저장된 진료 내용을 선택하면 입력 내용과 설명 카드를 다시 볼 수 있습니다.</Text>
        {records.length === 0 ? (
          <EmptyState icon="📋" title="저장된 기록이 없습니다" text="진료 내용을 정리한 뒤 기록 저장하기를 눌러주세요." />
        ) : (
          <View style={styles.desktopRecordGrid}>
            {records.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <Text style={styles.recordDate}>{formatDate(record.createdAt)}</Text>
                <Text style={styles.recordTitle}>{makeRecordTitle(record.result)}</Text>
                <Text style={styles.recordPreviewText}>{record.input || "입력 내용이 없습니다."}</Text>
                <View style={styles.recordButtonRow}>
                  <TouchableOpacity style={styles.recordOpenButton} onPress={() => handleDesktopOpenRecord(record)}>
                    <Text style={styles.recordOpenText}>다시 보기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.recordDeleteButton} onPress={() => deleteRecord(record.id)}>
                    <Text style={styles.recordDeleteText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderDesktopReminders = () => {
    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        <View style={styles.desktopWorkspaceHeader}>
          <View>
            <Text style={styles.desktopPageTitle}>약 알림 관리</Text>
            <Text style={styles.desktopPageSubtitle}>웹에서는 복용 시간을 저장하고 확인할 수 있습니다. 실제 푸시 알림은 모바일 앱에서 사용할 수 있습니다.</Text>
          </View>
          <TouchableOpacity style={styles.desktopPrimaryButton} onPress={() => setDesktopSection("workspace")}>
            <Text style={styles.desktopPrimaryButtonText}>진료 정리로 이동</Text>
          </TouchableOpacity>
        </View>
        {reminders.length === 0 ? (
          <EmptyState icon="💊" title="저장된 약 알림이 없습니다" text="쉬운 설명 카드에서 약 알림 설정을 눌러 알림을 만들 수 있습니다." />
        ) : (
          <View style={styles.desktopReminderGrid}>
            {reminders.map((item) => (
              <View key={item.id} style={styles.reminderCard}>
                <Text style={styles.reminderTime}>{formatKoreanTime(item.timeText)}</Text>
                <Text style={styles.reminderTitle}>{item.label}</Text>
                <Text style={styles.reminderBody}>{medicineTypeLabels[item.medicineType || "unknown"]} · {item.medicines.join(", ")}</Text>
                <TouchableOpacity style={styles.recordDeleteButton} onPress={() => deleteReminder(item.id)}>
                  <Text style={styles.recordDeleteText}>알림 삭제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderDesktopSettings = () => {
    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        <Text style={styles.desktopPageTitle}>설정</Text>
        <Text style={styles.desktopPageSubtitle}>식사 시간이 바뀌면 여기에서 수정할 수 있습니다.</Text>
        <View style={styles.desktopWorkspaceGrid}>
          <View style={styles.desktopPanelCard}>
            <Text style={styles.desktopPanelTitle}>기본 식사 시간</Text>
            {['breakfast', 'lunch', 'dinner'].map((mealKey) => (
              <View key={mealKey}>{renderMealEditor(mealKey)}</View>
            ))}
          </View>
          <View style={styles.desktopPanelCard}>
            <Text style={styles.desktopPanelTitle}>마이닥터 웹</Text>
            <Text style={styles.desktopPanelDescription}>
              마이닥터 PC 웹은 진료 내용을 쉽게 정리하고, 기록과 복용 시간을 확인할 수 있도록 돕는 웹 서비스입니다. 실제 휴대폰 푸시 알림은 모바일 앱에서 사용할 수 있습니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDesktopShare = () => {
    const message = familyMessage || buildFamilyMessage();
    return (
      <ScrollView contentContainerStyle={styles.desktopContentScroll}>
        <View style={styles.desktopPanelCard}>
          <Text style={styles.desktopPanelTitle}>보호자에게 보내기</Text>
          <View style={styles.familyMessageBox}>
            <Text style={styles.familyMessageTitle}>보호자용 요약문</Text>
            <Text style={styles.familyMessageText}>{message}</Text>
          </View>
          <TouchableOpacity style={styles.familyButtonLarge} onPress={handleNotifyFamily}>
            <Text style={styles.familyButtonText}>공유하기 / 다시 보내기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.desktopSecondaryButton} onPress={() => setScreen("result")}>
            <Text style={styles.desktopSecondaryButtonText}>설명 카드로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderDesktopMain = () => {
    if (desktopSection === "workspace") return renderDesktopWorkspace();
    if (desktopSection === "records") return renderDesktopRecords();
    if (desktopSection === "reminders") return renderDesktopReminders();
    if (desktopSection === "settings") return renderDesktopSettings();
    return renderDesktopDashboard();
  };

  const renderDesktopApp = () => {
    return (
      <SafeAreaView style={styles.desktopSafeArea}>
        <View style={styles.desktopShell}>
          {renderDesktopSidebar()}
          <View style={styles.desktopMainArea}>
            <View style={styles.desktopTopHeader}>
              <View>
                <Text style={styles.desktopHeaderTitle}>마이닥터</Text>
                <Text style={styles.desktopHeaderSub}>진료 설명부터 복용 관리까지 한 화면에서</Text>
              </View>
              <TouchableOpacity style={styles.desktopHeaderButton} onPress={handleDesktopNewVisit}>
                <Text style={styles.desktopHeaderButtonText}>+ 새 진료</Text>
              </TouchableOpacity>
            </View>
            {renderDesktopMain()}
          </View>
        </View>
      </SafeAreaView>
    );
  };

  const renderCurrentScreen = () => {
    if (screen === "input") return renderInputScreen();
    if (screen === "result") return renderResultScreen();
    if (screen === "share") return renderShareScreen();
    if (screen === "reminderSetup") return renderReminderSetupScreen();
    if (activeTab === "records") return renderRecordsScreen();
    if (activeTab === "reminders") return renderRemindersScreen();
    if (activeTab === "settings") return renderSettingsScreen();
    return renderHomeScreen();
  };

  if (isDesktopLayout) {
    return renderDesktopApp();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.webAppShell}>
          <View style={styles.appRoot}>{renderCurrentScreen()}</View>
          {renderBottomTabs()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>{icon} {title}</Text>
      <Text style={styles.infoCardText}>{text}</Text>
    </View>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

const baseText = {
  fontFamily: FONT.koBold,
  includeFontPadding: false,
  wordBreak: "keep-all",
  overflowWrap: "break-word",
};

const titleText = {
  fontFamily: FONT.koExtraBold,
  includeFontPadding: false,
  wordBreak: "keep-all",
  overflowWrap: "break-word",
};

const numberText = {
  fontFamily: FONT.enBold,
  includeFontPadding: false,
  wordBreak: "keep-all",
  overflowWrap: "break-word",
};

const buttonText = {
  fontFamily: FONT.koExtraBold,
  includeFontPadding: false,
  wordBreak: "keep-all",
  overflowWrap: "break-word",
};

const englishText = {
  fontFamily: FONT.enBold,
  includeFontPadding: false,
  wordBreak: "keep-all",
  overflowWrap: "break-word",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F8FB",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
    width: "100%",
    backgroundColor: "#F4F8FB",
    alignItems: "center",
  },
  webAppShell: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#F4F8FB",
    borderLeftWidth: Platform.OS === "web" ? 1 : 0,
    borderRightWidth: Platform.OS === "web" ? 1 : 0,
    borderColor: "#E1EDF4",
  },
  appRoot: {
    flex: 1,
    backgroundColor: "#F4F8FB",
  },
  appScreen: {
    flex: 1,
    backgroundColor: "#F4F8FB",
  },
  homeWrap: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 40,
    backgroundColor: "#F4F8FB",
    alignItems: "center",
  },
  homeLogoImage: {
    width: 160,
    height: 160,
    marginBottom: 4,
  },
  homeMainText: {
    ...titleText,
    fontSize: 22,
    lineHeight: 36,
    color: "#083A5A",
    textAlign: "center",
    marginBottom: 24,
  },
  homeFeatureBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#D8E7F0",
    marginBottom: 22,
    boxShadow: Platform.OS === "web" ? "0 10px 22px rgba(15, 49, 74, 0.08)" : undefined,
  },
  homeFeatureTitle: {
    ...titleText,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 12,
  },
  homeFeatureText: {
    ...baseText,
    fontSize: 18,
    lineHeight: 32,
    color: "#164B6A",
  },
  startButton: {
    width: "100%",
    backgroundColor: "#0B78A6",
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  startButtonText: {
    ...titleText,
    fontSize: 22,
    color: "#FFFFFF",
  },
  quickRow: {
    flexDirection: "row",
    width: "100%",
  },
  quickButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 17,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
    marginHorizontal: 5,
  },
  quickButtonText: {
    ...titleText,
    fontSize: 17,
    color: "#315B73",
  },
  topBar: {
    minHeight: 82,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#D8E7F0",
  },
  backIconButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#EDF5FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backIconText: {
    ...numberText,
    fontSize: 30,
    color: "#083A5A",
  },
  topBarTitleBox: {
    flex: 1,
  },
  topBarTitle: {
    ...titleText,
    fontSize: 23,
    color: "#083A5A",
  },
  topBarSubtitle: {
    ...numberText,
    fontSize: 14,
    color: "#4A7087",
    marginTop: 2,
  },
  logoMini: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.4,
    borderColor: "#CFE3EE",
  },
  logoMiniImage: {
    width: 48,
    height: 48,
  },
  screenBody: {
    padding: 18,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
    boxShadow: Platform.OS === "web" ? "0 8px 18px rgba(15, 49, 74, 0.06)" : undefined,
  },
  sectionTitle: {
    ...titleText,
    fontSize: 22,
    lineHeight: 34,
    color: "#083A5A",
    marginBottom: 10,
  },
  sectionDescription: {
    ...baseText,
    fontSize: 17,
    lineHeight: 30,
    color: "#315B73",
    marginBottom: 16,
  },
  textArea: {
    ...baseText,
    minHeight: 175,
    backgroundColor: "#F8FBFD",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#BCD7E5",
    padding: 16,
    fontSize: 18,
    lineHeight: 32,
    color: "#0B2535",
    marginBottom: 18,
    outlineStyle: "none",
  },
  photoButtonRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  voiceButtonColumn: {
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.6,
    borderColor: "#BCD7E5",
    marginHorizontal: 5,
  },
  clearButtonText: {
    ...titleText,
    fontSize: 17,
    color: "#315B73",
    textAlign: "center",
  },
  photoButton: {
    flex: 1,
    backgroundColor: "#EFF7FB",
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.8,
    borderColor: "#8FC7DE",
    marginHorizontal: 5,
  },
  listeningButton: {
    backgroundColor: "#EAF7EF",
    borderColor: "#7DD3A7",
  },
  photoButtonText: {
    ...titleText,
    fontSize: 17,
    color: "#0B5D83",
    textAlign: "center",
  },
  voiceMessage: {
    ...baseText,
    fontSize: 15,
    lineHeight: 25,
    color: "#0B5D83",
  },
  photoPreviewBox: {
    backgroundColor: "#F8FBFD",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
    marginBottom: 16,
  },
  photoPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  photoPreviewTitle: {
    ...titleText,
    fontSize: 17,
    color: "#083A5A",
  },
  photoRemoveText: {
    ...titleText,
    fontSize: 16,
    color: "#B91C1C",
  },
  medicineImageFrame: {
    width: "100%",
    height: 235,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D8E7F0",
  },
  medicineImage: {
    width: "100%",
    height: "100%",
  },
  photoAnalysisText: {
    ...baseText,
    fontSize: 17,
    lineHeight: 30,
    color: "#083A5A",
  },
  emptyPhotoBox: {
    minHeight: 172,
    borderRadius: 22,
    backgroundColor: "#F8FBFD",
    borderWidth: 2,
    borderColor: "#BCD7E5",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    marginBottom: 16,
  },
  emptyPhotoIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyPhotoText: {
    ...baseText,
    fontSize: 17,
    lineHeight: 30,
    color: "#315B73",
    textAlign: "center",
  },
  mainButton: {
    backgroundColor: "#0B78A6",
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  loadingButton: {
    backgroundColor: "#8AA8B8",
  },
  mainButtonText: {
    ...titleText,
    fontSize: 21,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  summaryBox: {
    backgroundColor: "#DFF1FA",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.8,
    borderColor: "#8FC7DE",
    marginBottom: 18,
  },
  summaryTitle: {
    ...titleText,
    fontSize: 21,
    lineHeight: 32,
    color: "#083A5A",
    marginBottom: 10,
  },
  summaryText: {
    ...baseText,
    fontSize: 18,
    lineHeight: 32,
    color: "#083A5A",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1.8,
    borderColor: "#D8E7F0",
  },
  infoCardTitle: {
    ...titleText,
    fontSize: 21,
    lineHeight: 32,
    color: "#083A5A",
    marginBottom: 13,
    paddingBottom: 11,
    borderBottomWidth: 2,
    borderBottomColor: "#EFF7FB",
  },
  infoCardText: {
    ...baseText,
    fontSize: 17,
    lineHeight: 31,
    color: "#17384A",
  },
  actionPanel: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 14,
  },
  familyButton: {
    flex: 1,
    backgroundColor: "#0B78A6",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    marginRight: 5,
  },
  familyButtonLarge: {
    marginTop: 18,
    backgroundColor: "#0B78A6",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
  },
  familyButtonText: {
    ...titleText,
    fontSize: 17,
    color: "#FFFFFF",
  },
  alarmButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
    marginLeft: 5,
  },
  alarmButtonText: {
    ...titleText,
    fontSize: 17,
    color: "#315B73",
  },
  saveButton: {
    backgroundColor: "#EAF7EF",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#B7E2C5",
  },
  saveButtonText: {
    ...titleText,
    fontSize: 17,
    color: "#14532D",
  },
  draftCard: {
    backgroundColor: "#F8FBFD",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BCD7E5",
    marginBottom: 12,
  },
  draftTypeLabel: {
    ...titleText,
    alignSelf: "flex-start",
    backgroundColor: "#DFF1FA",
    color: "#0B5D83",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  draftTitle: {
    ...titleText,
    fontSize: 18,
    color: "#083A5A",
    marginBottom: 8,
  },
  draftMedicine: {
    ...baseText,
    fontSize: 17,
    lineHeight: 28,
    color: "#17384A",
  },
  mealEditorBox: {
    backgroundColor: "#F8FBFD",
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
    marginBottom: 12,
    overflow: "hidden",
  },
  mealToggleButton: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealInputLabel: {
    ...titleText,
    fontSize: 17,
    color: "#083A5A",
    marginBottom: 5,
  },
  mealCurrentText: {
    ...numberText,
    fontSize: 19,
    color: "#0B78A6",
  },
  mealToggleText: {
    ...titleText,
    fontSize: 16,
    color: "#0B5D83",
  },
  timePickerPanel: {
    borderTopWidth: 1,
    borderTopColor: "#D8E7F0",
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  segmentRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#BCD7E5",
    marginHorizontal: 4,
    backgroundColor: "#F8FBFD",
  },
  segmentButtonActive: {
    backgroundColor: "#0B78A6",
    borderColor: "#0B78A6",
  },
  segmentButtonText: {
    ...titleText,
    fontSize: 16,
    color: "#315B73",
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
  },
  timePickerLabel: {
    ...titleText,
    fontSize: 15,
    color: "#315B73",
    marginTop: 8,
    marginBottom: 8,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeOption: {
    width: "15.4%",
    margin: "0.6%",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#F8FBFD",
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
  },
  timeOptionActive: {
    backgroundColor: "#DFF1FA",
    borderColor: "#0B78A6",
  },
  timeOptionText: {
    ...numberText,
    fontSize: 16,
    color: "#315B73",
  },
  timeOptionTextActive: {
    color: "#0B5D83",
  },
  smallSaveButton: {
    marginTop: 14,
    backgroundColor: "#0B78A6",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  smallSaveButtonText: {
    ...titleText,
    fontSize: 16,
    color: "#FFFFFF",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FBFD",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
  },
  planTime: {
    ...numberText,
    width: 92,
    fontSize: 18,
    color: "#0B78A6",
  },
  planTextBox: {
    flex: 1,
  },
  planTitle: {
    ...titleText,
    fontSize: 16,
    color: "#083A5A",
    marginBottom: 4,
  },
  planBody: {
    ...baseText,
    fontSize: 16,
    lineHeight: 26,
    color: "#17384A",
  },
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.6,
    borderColor: "#D8E7F0",
    marginBottom: 14,
  },
  recordDate: {
    ...numberText,
    fontSize: 15,
    color: "#0B78A6",
    marginBottom: 8,
  },
  recordTitle: {
    ...baseText,
    fontSize: 17,
    lineHeight: 29,
    color: "#17384A",
    marginBottom: 14,
  },
  recordButtonRow: {
    flexDirection: "row",
  },
  recordOpenButton: {
    flex: 1,
    backgroundColor: "#0B78A6",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 5,
  },
  recordOpenText: {
    ...titleText,
    fontSize: 16,
    color: "#FFFFFF",
  },
  recordDeleteButton: {
    backgroundColor: "#FFF1F2",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    marginLeft: 5,
  },
  recordDeleteText: {
    ...titleText,
    fontSize: 16,
    color: "#B91C1C",
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.6,
    borderColor: "#D8E7F0",
    marginBottom: 14,
  },
  reminderTime: {
    ...numberText,
    fontSize: 25,
    color: "#0B78A6",
    marginBottom: 8,
  },
  reminderTitle: {
    ...titleText,
    fontSize: 18,
    color: "#083A5A",
    marginBottom: 6,
  },
  reminderBody: {
    ...baseText,
    fontSize: 17,
    lineHeight: 29,
    color: "#17384A",
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 26,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D8E7F0",
  },
  emptyStateIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyStateTitle: {
    ...titleText,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    ...baseText,
    fontSize: 17,
    lineHeight: 29,
    color: "#315B73",
    textAlign: "center",
  },
  noticeBox: {
    backgroundColor: "#EAF7EF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#B7E2C5",
    marginBottom: 14,
  },
  noticeText: {
    ...baseText,
    fontSize: 16,
    lineHeight: 26,
    color: "#14532D",
  },
  familyMessageBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
  },
  familyMessageTitle: {
    ...titleText,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 14,
  },
  familyMessageText: {
    ...baseText,
    fontSize: 16,
    lineHeight: 30,
    color: "#17384A",
  },
  bottomTabs: {
    height: 82,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1.5,
    borderTopColor: "#D8E7F0",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#DFF1FA",
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    ...titleText,
    fontSize: 13,
    color: "#6B7C8D",
  },
  tabLabelActive: {
    color: "#0B5D83",
  },
  desktopSafeArea: {
    flex: 1,
    backgroundColor: "#EEF6FB",
  },
  desktopShell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EEF6FB",
  },
  desktopSidebar: {
    width: 296,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#D9E8F1",
    paddingVertical: 26,
    paddingHorizontal: 20,
  },
  desktopBrandBox: {
    alignItems: "center",
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEF5",
    marginBottom: 18,
  },
  desktopLogo: {
    width: 116,
    height: 70,
    marginBottom: 8,
  },
  desktopBrandText: {
    ...titleText,
    fontSize: 24,
    color: "#083A5A",
  },
  desktopBrandSub: {
    ...baseText,
    fontSize: 13,
    lineHeight: 20,
    color: "#5E7486",
    marginTop: 4,
  },
  desktopMenuList: {
    gap: 10,
  },
  desktopMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  desktopMenuButtonActive: {
    backgroundColor: "#DFF1FA",
  },
  desktopMenuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  desktopMenuTextBox: {
    flex: 1,
  },
  desktopMenuLabel: {
    ...titleText,
    fontSize: 16,
    color: "#31556B",
  },
  desktopMenuLabelActive: {
    color: "#075C86",
  },
  desktopMenuDescription: {
    ...baseText,
    fontSize: 12,
    lineHeight: 18,
    color: "#7A8B9B",
    marginTop: 2,
  },
  desktopMenuDescriptionActive: {
    color: "#0B6B98",
  },
  desktopSideNotice: {
    marginTop: "auto",
    backgroundColor: "#F1F8FC",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D7EAF4",
  },
  desktopSideNoticeTitle: {
    ...titleText,
    fontSize: 15,
    color: "#083A5A",
    marginBottom: 6,
  },
  desktopSideNoticeText: {
    ...baseText,
    fontSize: 13,
    lineHeight: 20,
    color: "#5D7180",
  },
  desktopMainArea: {
    flex: 1,
    minWidth: 0,
  },
  desktopTopHeader: {
    height: 86,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D9E8F1",
    paddingHorizontal: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  desktopHeaderTitle: {
    ...titleText,
    fontSize: 24,
    color: "#083A5A",
  },
  desktopHeaderSub: {
    ...baseText,
    fontSize: 14,
    lineHeight: 21,
    color: "#5E7486",
    marginTop: 2,
  },
  desktopHeaderButton: {
    backgroundColor: "#0B78A6",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  desktopHeaderButtonText: {
    ...buttonText,
    color: "#FFFFFF",
    fontSize: 15,
  },
  desktopContentScroll: {
    padding: 34,
    paddingBottom: 60,
    gap: 22,
  },
  desktopHeroGrid: {
    flexDirection: "row",
    gap: 22,
  },
  desktopHeroCard: {
    flex: 1.6,
    backgroundColor: "#FFFFFF",
    borderRadius: 34,
    padding: 34,
    borderWidth: 1,
    borderColor: "#DDEBF4",
    shadowColor: "#A8C6D8",
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  desktopStatusCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 34,
    padding: 28,
    borderWidth: 1,
    borderColor: "#DDEBF4",
  },
  desktopEyebrow: {
    ...englishText,
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#0B78A6",
    marginBottom: 14,
  },
  desktopHeroTitle: {
    ...titleText,
    fontSize: 40,
    lineHeight: 56,
    color: "#083A5A",
    marginBottom: 18,
  },
  desktopHeroText: {
    ...baseText,
    fontSize: 18,
    lineHeight: 31,
    color: "#496677",
    maxWidth: 760,
  },
  desktopHeroButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  desktopPrimaryButton: {
    backgroundColor: "#0B78A6",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopPrimaryButtonText: {
    ...buttonText,
    color: "#FFFFFF",
    fontSize: 16,
  },
  desktopSecondaryButton: {
    backgroundColor: "#EAF5FB",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopSecondaryButtonText: {
    ...buttonText,
    color: "#0B5D83",
    fontSize: 16,
  },
  desktopPanelTitle: {
    ...titleText,
    fontSize: 22,
    color: "#083A5A",
    marginBottom: 10,
  },
  desktopPanelDescription: {
    ...baseText,
    fontSize: 15,
    lineHeight: 24,
    color: "#5D7180",
    marginBottom: 16,
  },
  desktopStatRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
  },
  desktopStatBox: {
    flex: 1,
    backgroundColor: "#F1F8FC",
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
  },
  desktopStatNumber: {
    ...englishText,
    fontSize: 32,
    color: "#0B78A6",
  },
  desktopStatLabel: {
    ...baseText,
    fontSize: 14,
    color: "#536D80",
    marginTop: 4,
  },
  desktopMiniFeatureList: {
    gap: 8,
  },
  desktopMiniFeature: {
    ...baseText,
    fontSize: 15,
    lineHeight: 24,
    color: "#31556B",
  },
  desktopThreeColumn: {
    flexDirection: "row",
    gap: 18,
  },
  desktopActionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#DDEBF4",
  },
  desktopActionIcon: {
    fontSize: 34,
    marginBottom: 12,
  },
  desktopActionTitle: {
    ...titleText,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 8,
  },
  desktopActionText: {
    ...baseText,
    fontSize: 15,
    lineHeight: 25,
    color: "#5A7080",
  },
  desktopInfoGrid: {
    flexDirection: "row",
    gap: 18,
  },
  desktopInfoPanel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: "#DDEBF4",
  },
  desktopStepText: {
    ...baseText,
    fontSize: 16,
    lineHeight: 27,
    color: "#405B6E",
    marginTop: 8,
  },
  desktopWorkspaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 2,
  },
  desktopPageTitle: {
    ...titleText,
    fontSize: 32,
    lineHeight: 44,
    color: "#083A5A",
  },
  desktopPageSubtitle: {
    ...baseText,
    fontSize: 16,
    lineHeight: 25,
    color: "#5B7180",
    marginTop: 4,
  },
  desktopWorkspaceGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 22,
  },
  desktopPanelCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 26,
    borderWidth: 1,
    borderColor: "#DDEBF4",
    minWidth: 0,
  },
  desktopTextArea: {
    ...baseText,
    minHeight: 170,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#C8DFEB",
    backgroundColor: "#F8FCFE",
    padding: 18,
    fontSize: 17,
    lineHeight: 29,
    color: "#14394F",
    outlineStyle: "none",
  },
  desktopButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    alignItems: "center",
  },
  desktopSmallButton: {
    backgroundColor: "#EAF5FB",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  desktopSmallButtonText: {
    ...buttonText,
    color: "#0B5D83",
    fontSize: 15,
  },
  desktopClearButton: {
    backgroundColor: "#F2F4F6",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  desktopClearButtonText: {
    ...buttonText,
    color: "#5A6D7B",
    fontSize: 15,
  },
  desktopDivider: {
    height: 1,
    backgroundColor: "#E1EEF5",
    marginVertical: 24,
  },
  desktopPhotoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    backgroundColor: "#F8FCFE",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D8EAF3",
  },
  desktopMedicineImage: {
    width: 180,
    height: 180,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  desktopPhotoTextBox: {
    flex: 1,
    minWidth: 0,
  },
  desktopEmptyPhotoBox: {
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#D0E4EF",
    backgroundColor: "#F8FCFE",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopPlanBox: {
    marginTop: 12,
  },
  desktopRecordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  desktopReminderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  recordPreviewText: {
    ...baseText,
    fontSize: 14,
    lineHeight: 22,
    color: "#5B7180",
    marginTop: 8,
  },
});
