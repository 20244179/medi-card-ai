import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const LOGO = require("./assets/mydoctor-logo.png");

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const STORAGE_KEYS = {
  records: "MYDOCTOR_RECORDS",
  reminders: "MYDOCTOR_REMINDER_DRAFTS",
  mealTimes: "MYDOCTOR_MEAL_TIMES",
};

const defaultMealTimes = {
  breakfast: "",
  lunch: "",
  dinner: "",
};

const mealLabelMap = {
  breakfast: "아침 식사",
  lunch: "점심 식사",
  dinner: "저녁 식사",
};

const meridiemOptions = ["오전", "오후"];
const hourOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const minuteOptions = [0, 10, 20, 30, 40, 50];

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

export default function App() {
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

  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [mealTimes, setMealTimes] = useState(defaultMealTimes);
  const [reminderDrafts, setReminderDrafts] = useState([]);
  const [familyMessage, setFamilyMessage] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const [speechStatusText, setSpeechStatusText] = useState(
    "천천히 말씀하시면 입력칸에 자동으로 추가됩니다."
  );
  const lastSpeechTextRef = useRef("");

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setSpeechStatusText("듣고 있습니다. 진료실에서 들은 내용을 천천히 말씀해주세요.");
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    setSpeechStatusText("음성 입력이 끝났습니다. 내용이 맞는지 확인해주세요.");
    lastSpeechTextRef.current = "";
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    setSpeechStatusText(
      "음성을 정확히 듣지 못했습니다. 조용한 곳에서 다시 시도하거나 직접 입력해주세요."
    );
    console.log("speech recognition error", event);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = extractSpeechTranscript(event);

    if (!transcript || transcript === lastSpeechTextRef.current) {
      return;
    }

    lastSpeechTextRef.current = transcript;

    setUserInput((prev) => {
      const prefix = prev.trim() ? `${prev.trim()} ` : "";
      return `${prefix}${transcript}`;
    });

    const type = detectMedicineType(`${userInput} ${transcript} ${medicinePhotoName} ${medicineOcrText}`);

    if (type !== "unknown") {
      const analysis = getMedicineAnalysisText(type);
      setMedicineHintType(type);
      setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
      setReminderDrafts(generateReminderDrafts(type, `${userInput} ${transcript}`));
    }
  });

  async function initializeNotifications() {
    try {
      await Notifications.setNotificationChannelAsync("medicine-reminders", {
        name: "약 복용 알림",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0B78A6",
      });
    } catch (error) {
      console.log("notification channel error", error);
    }
  }

  useEffect(() => {
    loadStoredData();
    initializeNotifications();
  }, []);

  const loadStoredData = async () => {
    try {
      const recordText = await AsyncStorage.getItem(STORAGE_KEYS.records);
      const reminderText = await AsyncStorage.getItem(STORAGE_KEYS.reminders);
      const mealText = await AsyncStorage.getItem(STORAGE_KEYS.mealTimes);

      if (recordText) {
        setRecords(JSON.parse(recordText));
      }

      if (reminderText) {
        setReminders(JSON.parse(reminderText));
      }

      if (mealText) {
        setMealTimes({
          ...defaultMealTimes,
          ...JSON.parse(mealText),
        });
      }
    } catch (error) {
      console.log("stored data load error", error);
    }
  };

  const saveRecords = async (nextRecords) => {
    setRecords(nextRecords);
    await AsyncStorage.setItem(STORAGE_KEYS.records, JSON.stringify(nextRecords));
  };

  const saveReminders = async (nextReminders) => {
    setReminders(nextReminders);
    await AsyncStorage.setItem(
      STORAGE_KEYS.reminders,
      JSON.stringify(nextReminders)
    );
  };

  const saveMealTimes = async (nextMealTimes, options = { reschedule: true }) => {
    setMealTimes(nextMealTimes);
    await AsyncStorage.setItem(
      STORAGE_KEYS.mealTimes,
      JSON.stringify(nextMealTimes)
    );

    if (options.reschedule && reminders.length > 0) {
      await rescheduleSavedReminders(nextMealTimes);
    }
  };

  const normalizeText = (text) => {
    return String(text || "").toLowerCase().trim();
  };

  const removeSpaces = (text) => {
    return String(text || "").toLowerCase().replace(/\s/g, "");
  };

  const includesKeyword = (sourceText, keywords) => {
    const normal = normalizeText(sourceText);
    const compact = removeSpaces(sourceText);

    return keywords.some((keyword) => {
      const keyNormal = normalizeText(keyword);
      const keyCompact = removeSpaces(keyword);

      return normal.includes(keyNormal) || compact.includes(keyCompact);
    });
  };

  const detectMedicineType = (text = "") => {
    const diabetesKeywords = [
      "당뇨",
      "당뇨병",
      "혈당",
      "혈당조절",
      "혈당 조절",
      "인슐린",
      "메트포르민",
      "다이아벡스",
      "글루파",
      "글루파850",
      "glupa",
      "glupa850",
      "다이아미크론",
      "디아미크론",
      "다이아미크론엠알",
      "디아미크론엠알",
      "diamicron",
      "diamicron mr",
      "diamicronmr",
      "gliclazide",
      "metformin",
      "insulin",
      "glucose",
      "diabetes",
    ];

    const bloodPressureKeywords = [
      "고혈압",
      "혈압",
      "암로디핀",
      "노바스크",
      "로사르탄",
      "발사르탄",
      "텔미사르탄",
      "amlodipine",
      "losartan",
      "valsartan",
      "telmisartan",
      "hypertension",
      "blood pressure",
    ];

    const refluxKeywords = [
      "역류",
      "속쓰림",
      "속 쓰림",
      "식도염",
      "위산",
      "위산분비억제",
      "위산 분비 억제",
      "오메프라졸",
      "판토프라졸",
      "란소프라졸",
      "라베프라졸",
      "omeprazole",
      "pantoprazole",
      "lansoprazole",
      "rabeprazole",
      "reflux",
      "ppi",
    ];

    if (includesKeyword(text, diabetesKeywords)) {
      return "diabetes";
    }

    if (includesKeyword(text, bloodPressureKeywords)) {
      return "bloodPressure";
    }

    if (includesKeyword(text, refluxKeywords)) {
      return "reflux";
    }

    return "unknown";
  };

  const getMedicineAnalysisText = (type) => {
    if (type === "diabetes") {
      return {
        title: "당뇨약 또는 혈당 조절 단서가 확인되었습니다.",
        message:
          "약마다 복용 시간이 다를 수 있습니다.\n약 봉투의 복용법을 꼭 확인해주세요.\n식은땀, 손떨림, 심한 어지러움은 저혈당 증상일 수 있습니다.",
      };
    }

    if (type === "bloodPressure") {
      return {
        title: "혈압약 관련 단서가 확인되었습니다.",
        message:
          "혈압약은 매일 같은 시간에 꾸준히 드시는 것이 중요합니다.\n증상이 없다고 임의로 중단하면 혈압이 다시 올라갈 수 있습니다.",
      };
    }

    if (type === "reflux") {
      return {
        title: "위산 억제제 관련 단서가 확인되었습니다.",
        message:
          "위산을 줄이는 약은 식사 전 복용이 중요한 경우가 많습니다.\n정확한 복용법은 약 봉투와 처방전을 함께 확인해주세요.",
      };
    }

    return {
      title: "약 봉투 사진이 첨부되었습니다.",
      message:
        "약 이름과 복용 시간이 잘 보이도록 촬영된 사진이면 복약 설명에 도움이 됩니다.\n진료 내용을 함께 입력하면 더 정확히 정리할 수 있습니다.",
    };
  };

  const getMedicinePurposeLabel = (type) => {
    if (type === "diabetes") {
      return "당뇨병 약";
    }

    if (type === "bloodPressure") {
      return "혈압약";
    }

    if (type === "reflux") {
      return "위산·역류성 식도염 약";
    }

    return "복용 약";
  };

  const generateReminderDrafts = (type, text = "") => {
    const detected = type !== "unknown" ? type : detectMedicineType(text);

    if (detected === "diabetes") {
      return [
        {
          id: "morning-before",
          label: "아침 식전 30분",
          meal: "breakfast",
          offsetMinutes: -30,
          medicines: ["DiAMiCRON MR", "Dexima"],
        },
        {
          id: "morning-after",
          label: "아침 식후 30분",
          meal: "breakfast",
          offsetMinutes: 30,
          medicines: ["Rosuzet"],
        },
        {
          id: "breakfast-dinner-after",
          label: "아침, 저녁 식사 직후",
          meal: "breakfastDinner",
          offsetMinutes: 10,
          medicines: ["GLUPA 850"],
        },
      ];
    }

    if (detected === "bloodPressure") {
      return [
        {
          id: "morning-bp",
          label: "아침 식후 30분",
          meal: "breakfast",
          offsetMinutes: 30,
          medicines: ["혈압약"],
        },
      ];
    }

    if (detected === "reflux") {
      return [
        {
          id: "morning-reflux",
          label: "아침 식전 30분",
          meal: "breakfast",
          offsetMinutes: -30,
          medicines: ["위산 억제제"],
        },
      ];
    }

    return [
      {
        id: "general-after",
        label: "식후 복용 알림",
        meal: "breakfast",
        offsetMinutes: 30,
        medicines: ["약 봉투에서 확인된 약"],
      },
    ];
  };

  const parseTime = (timeText) => {
    if (!timeText) {
      return null;
    }

    const parts = String(timeText).split(":");
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    return { hour, minute };
  };

  const addMinutesToTime = (timeText, offsetMinutes) => {
    const parsed = parseTime(timeText);

    if (!parsed) {
      return "";
    }

    const date = new Date();

    date.setHours(parsed.hour, parsed.minute, 0, 0);
    date.setMinutes(date.getMinutes() + offsetMinutes);

    const hourText = String(date.getHours()).padStart(2, "0");
    const minuteText = String(date.getMinutes()).padStart(2, "0");

    return `${hourText}:${minuteText}`;
  };

  const formatTimeForDisplay = (timeText) => {
    const parsed = parseTime(timeText);

    if (!parsed) {
      return "아직 설정하지 않음";
    }

    const meridiem = parsed.hour < 12 ? "오전" : "오후";
    const displayHour = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
    const displayMinute = String(parsed.minute).padStart(2, "0");

    return `${meridiem} ${displayHour}시 ${displayMinute}분`;
  };

  const extractSpeechTranscript = (event) => {
    if (!event) {
      return "";
    }

    if (typeof event.transcript === "string") {
      return event.transcript.trim();
    }

    if (Array.isArray(event.results) && event.results.length > 0) {
      const firstResult = event.results[0];

      if (typeof firstResult?.transcript === "string") {
        return firstResult.transcript.trim();
      }

      if (Array.isArray(firstResult) && firstResult.length > 0) {
        const firstAlternative = firstResult[0];

        if (typeof firstAlternative?.transcript === "string") {
          return firstAlternative.transcript.trim();
        }
      }

      if (Array.isArray(firstResult?.alternatives) && firstResult.alternatives.length > 0) {
        const firstAlternative = firstResult.alternatives[0];

        if (typeof firstAlternative?.transcript === "string") {
          return firstAlternative.transcript.trim();
        }
      }
    }

    return "";
  };

  const getRequiredMealKeys = (drafts) => {
    const keys = new Set();

    drafts.forEach((draft) => {
      if (draft.meal === "breakfastDinner") {
        keys.add("breakfast");
        keys.add("dinner");
      } else if (draft.meal) {
        keys.add(draft.meal);
      }
    });

    return Array.from(keys);
  };

  const getMissingMealKeys = (drafts, currentMealTimes) => {
    return getRequiredMealKeys(drafts).filter((key) => !currentMealTimes[key]);
  };

  const buildReminderPlans = (drafts, currentMealTimes) => {
    const plans = [];

    drafts.forEach((draft) => {
      const addPlan = (mealKey, suffix = "") => {
        const baseTime = currentMealTimes[mealKey];
        const timeText = addMinutesToTime(baseTime, draft.offsetMinutes);

        plans.push({
          id: `${draft.id}-${mealKey}`,
          draftId: draft.id,
          mealKey,
          offsetMinutes: draft.offsetMinutes,
          label: `${draft.label}${suffix}`,
          timeText,
          medicines: draft.medicines,
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
  };

  const handleStartVoiceInput = async (mode = "append") => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "마이크 권한 필요",
          "음성으로 진료 내용을 입력하려면 마이크 권한을 허용해주세요."
        );
        return;
      }

      if (mode === "reset") {
        setUserInput("");
      }

      lastSpeechTextRef.current = "";
      setSpeechStatusText("듣고 있습니다. 말씀을 마치면 자동으로 입력됩니다.");

      ExpoSpeechRecognitionModule.start({
        lang: "ko-KR",
        interimResults: false,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (error) {
      setIsListening(false);
      setSpeechStatusText(
        "음성 입력을 시작하지 못했습니다. 직접 입력하거나 다시 시도해주세요."
      );
      console.log("start speech recognition error", error);
    }
  };

  const handleStopVoiceInput = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
      setSpeechStatusText("음성 입력을 정리하고 있습니다.");
    } catch (error) {
      setIsListening(false);
      console.log("stop speech recognition error", error);
    }
  };

  const processPickedImage = async (asset, sourceLabel) => {
    if (!asset || !asset.uri) {
      return;
    }

    const fallbackName = `${sourceLabel}_medicine_bag.jpg`;
    const name =
      asset.fileName || String(asset.uri).split("/").pop() || fallbackName;

    setMedicinePhotoUri(asset.uri);
    setMedicinePhotoName(name);
    setMedicinePhotoAnalysis(
      "약 봉투 사진을 확인하고 있습니다.\n글자가 선명할수록 더 정확하게 읽을 수 있습니다."
    );

    let ocrText = "";

    try {
      if (isSupported) {
        const extracted = await extractTextFromImage(asset.uri);

        if (Array.isArray(extracted)) {
          ocrText = extracted.join(" ");
        } else if (typeof extracted === "string") {
          ocrText = extracted;
        }
      }
    } catch (error) {
      console.log("OCR error", error);
    }

    setMedicineOcrText(ocrText);

    const analysisSource = `${name} ${userInput} ${ocrText}`;
    const detectedType = detectMedicineType(analysisSource);
    const analysis = getMedicineAnalysisText(detectedType);

    setMedicineHintType(detectedType);

    if (ocrText.trim()) {
      setMedicinePhotoAnalysis(
        `${analysis.title}\n${analysis.message}\n\n약 봉투 사진의 글자를 확인해 복약 설명에 반영했습니다.`
      );
    } else {
      setMedicinePhotoAnalysis(
        "약 봉투 글자를 정확히 읽기 어렵습니다.\n약 이름과 복용 시간이 잘 보이도록 다시 촬영하거나, 진료 내용을 직접 입력해주세요."
      );
    }

    setReminderDrafts(generateReminderDrafts(detectedType, analysisSource));
  };

  const handleSelectMedicinePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "사진 접근 권한 필요",
        "약 봉투 사진을 선택하려면 사진 접근 권한을 허용해주세요."
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!pickerResult.canceled) {
      await processPickedImage(pickerResult.assets && pickerResult.assets[0], "selected");
    }
  };

  const handleCaptureMedicinePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "카메라 권한 필요",
        "약 봉투를 촬영하려면 카메라 권한을 허용해주세요."
      );
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!cameraResult.canceled) {
      await processPickedImage(cameraResult.assets && cameraResult.assets[0], "captured");
    }
  };

  const handleRemoveMedicinePhoto = () => {
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("unknown");
    setReminderDrafts([]);
  };

  const buildResultByType = (type) => {
    if (type === "diabetes") {
      return {
        summary:
          "당뇨약 또는 혈당 조절 단서가 확인되었습니다.\n약 복용 시간과 식사 시간을 함께 지키는 것이 중요합니다.",
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
        summary:
          "혈압약 관련 단서가 확인되었습니다.\n증상이 없어도 매일 같은 시간에 복용하는 것이 중요합니다.",
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
        summary:
          "위산 또는 역류성 식도염 관련 단서가 확인되었습니다.\n약 복용 시간과 식습관을 함께 확인하는 것이 중요합니다.",
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
        summary:
          "약 봉투 사진이 첨부되었습니다.\n약 이름과 복용법은 약 봉투와 처방전을 함께 확인해주세요.",
        disease:
          "현재는 진료 내용이 입력되지 않아 정확한 병명은 알 수 없습니다. 병명이나 증상을 함께 입력하면 더 구체적인 설명을 받을 수 있습니다.",
        medicine:
          medicinePhotoAnalysis ||
          "약 봉투 사진이 첨부되었습니다. 약 이름, 용량, 복용 시간은 약 봉투와 처방전을 기준으로 확인해야 합니다.",
        caution:
          "사진만으로 약을 임의로 판단하거나 복용법을 바꾸면 안 됩니다. 약 이름이 헷갈리거나 복용 시간을 잊은 경우에는 약국이나 병원에 확인하는 것이 안전합니다.",
        hospital:
          "약을 먹은 뒤 두드러기, 호흡곤란, 심한 어지러움, 입술이나 얼굴이 붓는 증상이 생기면 즉시 진료를 받아야 합니다.",
      };
    }

    return {
      summary:
        "입력하신 진료 내용을 바탕으로 정리했습니다.\n정확한 내용은 처방전과 의료진 설명을 함께 확인해주세요.",
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
      Alert.alert("입력 필요", "진료 내용 또는 약 봉투 사진을 먼저 넣어주세요.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const finalType =
        medicineHintType !== "unknown"
          ? medicineHintType
          : detectMedicineType(`${userInput} ${medicinePhotoName}`);

      const nextResult = buildResultByType(finalType);

      setResult(nextResult);
      setReminderDrafts(generateReminderDrafts(finalType, userInput));
      setIsLoading(false);
      setScreen("result");
      setActiveTab("home");
    }, 500);
  };

  const saveCurrentRecord = async () => {
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

    const nextRecords = [newRecord, ...records];
    await saveRecords(nextRecords);

    Alert.alert("저장 완료", "진료 기록이 저장되었습니다.");
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
    setReminderDrafts(generateReminderDrafts(record.medicineHintType, record.input || ""));
    setActiveTab("home");
    setScreen("result");
  };

  const deleteRecord = async (recordId) => {
    const nextRecords = records.filter((item) => item.id !== recordId);
    await saveRecords(nextRecords);
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
      await Share.share({
        title: "진료 내용 요약",
        message,
      });
    } catch (error) {
      console.log("share error", error);
    }
  };

  const requestNotificationPermission = async () => {
    await initializeNotifications();

    const currentPermission = await Notifications.getPermissionsAsync();

    if (currentPermission.granted) {
      return true;
    }

    const requestedPermission = await Notifications.requestPermissionsAsync();
    return requestedPermission.granted;
  };

  const getSecondsUntilTime = (timeText) => {
    const parsed = parseTime(timeText);

    if (!parsed) {
      return null;
    }

    const now = new Date();
    const target = new Date();

    target.setHours(parsed.hour, parsed.minute, 0, 0);

    if (target.getTime() <= now.getTime() + 60000) {
      target.setDate(target.getDate() + 1);
    }

    return Math.max(60, Math.round((target.getTime() - now.getTime()) / 1000));
  };

  const getNextReminderDate = (timeText) => {
    const parsed = parseTime(timeText);

    if (!parsed) {
      return null;
    }

    const now = new Date();
    const target = new Date();

    target.setHours(parsed.hour, parsed.minute, 0, 0);

    if (target.getTime() <= now.getTime() + 60000) {
      target.setDate(target.getDate() + 1);
    }

    return target;
  };

  const scheduleMedicineNotification = async (plan) => {
    const targetDate = getNextReminderDate(plan.timeText);

    if (!targetDate) {
      throw new Error("식사 시간이 설정되지 않았습니다.");
    }

    const medicineText = plan.medicines.join(", ");

    return Notifications.scheduleNotificationAsync({
      content: {
        title: "마이닥터 약 복용 알림",
        body: `${medicineText} 복용 시간입니다. 약 봉투의 복용법을 한 번 더 확인해주세요.`,
        data: {
          type: "medicine-reminder",
          label: plan.label,
          medicines: plan.medicines,
          timeText: plan.timeText,
        },
      },
      trigger: {
        date: targetDate,
        channelId: "medicine-reminders",
      },
    });
  };

  const cancelReminderNotifications = async (reminder) => {
    const notificationIds = [];

    if (reminder?.notificationId) {
      notificationIds.push(reminder.notificationId);
    }

    if (Array.isArray(reminder?.notificationIds)) {
      reminder.notificationIds.forEach((id) => {
        if (id) {
          notificationIds.push(id);
        }
      });
    }

    for (const id of Array.from(new Set(notificationIds))) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        console.log("cancel notification error", error);
      }
    }
  };

  const rescheduleSavedReminders = async (nextMealTimes) => {
    const updatedReminders = [];

    for (const reminder of reminders) {
      if (!reminder.mealKey || typeof reminder.offsetMinutes !== "number") {
        updatedReminders.push(reminder);
        continue;
      }

      await cancelReminderNotifications(reminder);

      const nextTimeText = addMinutesToTime(
        nextMealTimes[reminder.mealKey],
        reminder.offsetMinutes
      );

      if (!nextTimeText) {
        updatedReminders.push({
          ...reminder,
          timeText: "",
          notificationId: null,
          notificationIds: [],
        });
        continue;
      }

      const nextPlan = {
        ...reminder,
        timeText: nextTimeText,
      };

      try {
        const notificationId = await scheduleMedicineNotification(nextPlan);
        updatedReminders.push({
          ...nextPlan,
          notificationId,
          notificationIds: [notificationId],
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.log("reschedule reminder error", error);
        updatedReminders.push({
          ...nextPlan,
          notificationId: null,
          notificationIds: [],
        });
      }
    }

    setReminders(updatedReminders);
    await AsyncStorage.setItem(
      STORAGE_KEYS.reminders,
      JSON.stringify(updatedReminders)
    );
  };

  const saveReminderPlans = async () => {
    try {
      const missingMealKeys = getMissingMealKeys(reminderDrafts, mealTimes);

      if (missingMealKeys.length > 0) {
        Alert.alert(
          "식사 시간이 필요합니다",
          `${missingMealKeys
            .map((key) => mealLabelMap[key])
            .join(", ")} 시간을 먼저 선택해주세요. 선택 후 다시 알림 저장하기를 누르면 됩니다.`
        );
        return;
      }

      const permissionGranted = await requestNotificationPermission();

      if (!permissionGranted) {
        Alert.alert(
          "알림 권한 필요",
          "약 복용 알림을 저장하려면 알림 권한을 허용해주세요."
        );
        return;
      }

      const basePlans = buildReminderPlans(reminderDrafts, mealTimes);
      const scheduledPlans = [];
      const savedAt = Date.now();
      const purposeLabel = getMedicinePurposeLabel(medicineHintType);

      for (let index = 0; index < basePlans.length; index += 1) {
        const plan = basePlans[index];
        const notificationId = await scheduleMedicineNotification(plan);

        scheduledPlans.push({
          ...plan,
          id: `${plan.id}-${savedAt}-${index}`,
          purposeLabel,
          notificationId,
          notificationIds: [notificationId],
          createdAt: new Date().toISOString(),
        });
      }

      const nextReminders = [...scheduledPlans, ...reminders];
      await saveReminders(nextReminders);

      Alert.alert(
        "약 알림 저장",
        "약 복용 알림이 저장되었습니다. 설정한 식사 시간에 맞춰 휴대폰 알림으로 알려드립니다."
      );

      setActiveTab("home");
      setScreen("result");
    } catch (error) {
      console.log("save reminder notification error", error);
      Alert.alert(
        "알림 저장 오류",
        "약 알림을 저장하지 못했습니다. 알림 권한과 식사 시간을 확인한 뒤 다시 시도해주세요."
      );
    }
  };

  const deleteReminder = async (id, notificationId) => {
    const targetReminder = reminders.find((item) => {
      if (notificationId && item.notificationId) {
        return item.id === id && item.notificationId === notificationId;
      }

      return item.id === id;
    });

    Alert.alert(
      "알림 삭제",
      "이 약 알림을 삭제할까요? 삭제하면 예약된 휴대폰 알림도 함께 취소됩니다.",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제하기",
          style: "destructive",
          onPress: async () => {
            if (targetReminder) {
              await cancelReminderNotifications(targetReminder);
            }

            const nextReminders = reminders.filter((item) => {
              if (notificationId && item.notificationId) {
                return !(item.id === id && item.notificationId === notificationId);
              }

              return item.id !== id;
            });

            await saveReminders(nextReminders);
          },
        },
      ]
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
    setReminderDrafts([]);
    setFamilyMessage("");
    setEditingRecord(null);
    setIsListening(false);
    setSpeechStatusText("천천히 말씀하시면 입력칸에 자동으로 추가됩니다.");
    lastSpeechTextRef.current = "";
  };

  const handleClear = () => {
    clearInputState();
    setScreen("input");
    setActiveTab("home");
  };

  const resetAllAndGoHome = () => {
    clearInputState();
    setScreen("home");
    setActiveTab("home");
  };

  const openReminderSetup = () => {
    const finalType =
      medicineHintType !== "unknown"
        ? medicineHintType
        : detectMedicineType(`${userInput} ${medicinePhotoName}`);

    setReminderDrafts(generateReminderDrafts(finalType, userInput));
    setScreen("reminderSetup");
    setActiveTab("home");
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}`;
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
            MyDoctor
          </Text>
        </View>

        <TouchableOpacity style={styles.logoMini} onPress={resetAllAndGoHome}>
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
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
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

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              clearInputState();
              setScreen("input");
              setActiveTab("home");
            }}
          >
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
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1단계</Text>
          </View>

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
              onChangeText={(text) => {
                setUserInput(text);

                const type = detectMedicineType(`${text} ${medicinePhotoName}`);

                if (type !== "unknown") {
                  const analysis = getMedicineAnalysisText(type);
                  setMedicineHintType(type);
                  setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
                  setReminderDrafts(generateReminderDrafts(type, text));
                }
              }}
              placeholder="예: 당뇨 때문에 병원에 갔고 약을 받았어요. 식후에 먹으라고 하셨어요."
              placeholderTextColor="#6B7C8D"
            />

            <View style={styles.voiceBox}>
              <Text style={styles.voiceTitle}>음성으로 입력하기</Text>
              <Text style={styles.voiceDescription}>{speechStatusText}</Text>

              <View style={styles.voiceButtonRow}>
                <TouchableOpacity
                  style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                  onPress={() => handleStartVoiceInput("append")}
                  disabled={isListening}
                >
                  <Text style={[styles.voiceButtonText, isListening && styles.voiceButtonTextActive]}>
                    {isListening ? "듣고 있어요" : "🎙️ 이어 말하기"}
                  </Text>
                </TouchableOpacity>

                {isListening ? (
                  <TouchableOpacity style={styles.voiceStopButton} onPress={handleStopVoiceInput}>
                    <Text style={styles.voiceStopButtonText}>듣기 중지</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.voiceResetButton}
                    onPress={() => handleStartVoiceInput("reset")}
                  >
                    <Text style={styles.voiceResetButtonText}>처음부터 말하기</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2단계</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>약 봉투 사진을 넣어주세요</Text>
            <Text style={styles.sectionDescription}>
              약 봉투 사진은 복약 설명과 알림 초안에 함께 표시됩니다.
            </Text>

            <View style={styles.photoButtonRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleSelectMedicinePhoto}
              >
                <Text style={styles.photoButtonText}>🖼️ 사진 선택</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleCaptureMedicinePhoto}
              >
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
                  <Image
                    source={{ uri: medicinePhotoUri }}
                    style={styles.medicineImage}
                    resizeMode="contain"
                  />
                </View>

                {medicinePhotoAnalysis ? (
                  <Text style={styles.photoAnalysisText}>
                    {medicinePhotoAnalysis}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyPhotoBox}>
                <Text style={styles.emptyPhotoIcon}>📄</Text>
                <Text style={styles.emptyPhotoText}>
                  약 봉투 사진을 넣으면{"\n"}복약 설명에 함께 반영됩니다.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.mainButton, isLoading && styles.loadingButton]}
            onPress={handleTranslate}
            disabled={isLoading}
          >
            <Text style={styles.mainButtonText}>
              {isLoading ? "진료 내용을 정리하고 있습니다." : "AI로 쉽게 정리하기"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>전체 입력 지우기</Text>
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
              <Text style={styles.noticeText}>
                저장된 진료 기록을 다시 보고 있습니다.
              </Text>
            </View>
          ) : null}

          {editingRecord ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>당시 입력한 내용</Text>
              {userInput ? (
                <Text style={styles.recordDetailText}>{userInput}</Text>
              ) : (
                <Text style={styles.sectionDescription}>저장된 입력 내용이 없습니다.</Text>
              )}

              {medicinePhotoUri ? (
                <View style={styles.savedPhotoBox}>
                  <Text style={styles.photoPreviewTitle}>당시 첨부한 약 봉투 사진</Text>
                  <View style={styles.medicineImageFrame}>
                    <Image
                      source={{ uri: medicinePhotoUri }}
                      style={styles.medicineImage}
                      resizeMode="contain"
                    />
                  </View>
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

  const renderReminderSetupScreen = () => {
    const missingMealKeys = getMissingMealKeys(reminderDrafts, mealTimes);
    const plans = buildReminderPlans(reminderDrafts, mealTimes);

    return (
      <View style={styles.appScreen}>
        {renderTopBar("약 알림 설정", "result")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>AI가 약 알림을 준비했습니다</Text>
            <Text style={styles.sectionDescription}>
              약 봉투와 입력한 진료 내용을 바탕으로 복용 시간을 정리했습니다. 복용법은 약 봉투와 한 번 더 확인해주세요.
            </Text>

            {reminderDrafts.map((draft) => (
              <View key={draft.id} style={styles.draftCard}>
                <Text style={styles.draftTitle}>{draft.label}</Text>
                <Text style={styles.medicinePurposeText}>
                  {getMedicinePurposeLabel(medicineHintType)}
                </Text>

                {draft.medicines.map((med) => (
                  <Text key={med} style={styles.draftMedicine}>
                    - {med}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {missingMealKeys.length > 0 ? "식사 시간을 먼저 선택해주세요" : "식사 시간이 설정되었습니다"}
            </Text>
            <Text style={styles.sectionDescription}>
              {missingMealKeys.length > 0
                ? "약 알림 시간을 계산하려면 평소 식사 시간이 필요합니다. 직접 입력하지 않고 아래 버튼에서 골라주세요."
                : "아래 식사 시간을 기준으로 약 알림이 예약됩니다. 바꾸고 싶으면 여기에서 다시 선택할 수 있습니다."}
            </Text>

            <MealInput
              label="아침 식사"
              value={mealTimes.breakfast}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, breakfast: text })
              }
            />

            <MealInput
              label="점심 식사"
              value={mealTimes.lunch}
              onChangeText={(text) => saveMealTimes({ ...mealTimes, lunch: text })}
            />

            <MealInput
              label="저녁 식사"
              value={mealTimes.dinner}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, dinner: text })
              }
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>저장될 알림</Text>

            {plans.map((plan) => (
              <View key={plan.id} style={styles.planRow}>
                <Text style={styles.planTime}>
                  {plan.timeText ? formatTimeForDisplay(plan.timeText) : "시간 설정 필요"}
                </Text>

                <View style={styles.planTextBox}>
                  <Text style={styles.planTitle}>{plan.label}</Text>
                  <Text style={styles.medicinePurposeText}>
                    {getMedicinePurposeLabel(medicineHintType)}
                  </Text>
                  <Text style={styles.planBody}>{plan.medicines.join(", ")}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={saveReminderPlans}>
            <Text style={styles.mainButtonText}>알림 저장하기</Text>
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
            <EmptyState
              icon="📋"
              title="저장된 기록이 없습니다"
              text="진료 내용을 정리한 뒤 기록 저장하기를 눌러주세요."
            />
          ) : (
            records.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <Text style={styles.recordDate}>{formatDate(record.createdAt)}</Text>

                <Text style={styles.recordTitle}>
                  {record.result && record.result.summary
                    ? record.result.summary
                    : "진료 기록"}
                </Text>

                <View style={styles.recordButtonRow}>
                  <TouchableOpacity
                    style={styles.recordOpenButton}
                    onPress={() => openRecord(record)}
                  >
                    <Text style={styles.recordOpenText}>다시 보기</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recordDeleteButton}
                    onPress={() => deleteRecord(record.id)}
                  >
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
              저장된 약 복용 알림을 확인할 수 있습니다. 식사 시간 변경은 설정 탭에서 할 수 있습니다.
            </Text>
          </View>

          {reminders.length === 0 ? (
            <EmptyState
              icon="💊"
              title="저장된 알림이 없습니다"
              text="쉬운 설명 카드에서 약 알림 설정을 눌러 알림을 만들 수 있습니다."
            />
          ) : (
            reminders.map((item, index) => (
              <View key={`${item.id}-${item.notificationId || index}`} style={styles.reminderCard}>
                <Text style={styles.reminderTime}>
                  {item.timeText ? formatTimeForDisplay(item.timeText) : "시간 설정 필요"}
                </Text>
                <Text style={styles.reminderTitle}>{item.label}</Text>
                <Text style={styles.medicinePurposeText}>
                  {item.purposeLabel || "복용 약"}
                </Text>
                <Text style={styles.reminderBody}>{item.medicines.join(", ")}</Text>

                <TouchableOpacity
                  style={styles.recordDeleteButton}
                  onPress={() => deleteReminder(item.id, item.notificationId)}
                >
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
            <Text style={styles.sectionDescription}>
              식사 시간이 바뀌면 저장된 약 알림도 새 시간에 맞춰 다시 예약됩니다.
            </Text>

            <MealInput
              label="아침 식사"
              value={mealTimes.breakfast}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, breakfast: text })
              }
            />

            <MealInput
              label="점심 식사"
              value={mealTimes.lunch}
              onChangeText={(text) => saveMealTimes({ ...mealTimes, lunch: text })}
            />

            <MealInput
              label="저녁 식사"
              value={mealTimes.dinner}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, dinner: text })
              }
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>앱 정보</Text>
            <Text style={styles.sectionDescription}>
              마이닥터는 진료 내용을 쉽게 정리하고, 가족 공유와 약 알림을 도와주는 AI 보조 앱입니다.
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
          <View style={styles.shareNoticeBox}>
            <Text style={styles.shareNoticeText}>
              아래 내용을 복사하거나 공유 버튼을 눌러 가족에게 전달해주세요.
            </Text>
          </View>

          <View style={styles.familyMessageBox}>
            <Text style={styles.familyMessageTitle}>보호자용 요약문</Text>
            <Text style={styles.familyMessageText}>{message}</Text>
          </View>

          <TouchableOpacity style={styles.familyButtonLarge} onPress={handleNotifyFamily}>
            <Text style={styles.familyButtonText}>공유하기 / 다시 보내기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderCurrentScreen = () => {
    if (screen === "input") {
      return renderInputScreen();
    }

    if (screen === "result") {
      return renderResultScreen();
    }

    if (screen === "share") {
      return renderShareScreen();
    }

    if (screen === "reminderSetup") {
      return renderReminderSetupScreen();
    }

    if (activeTab === "records") {
      return renderRecordsScreen();
    }

    if (activeTab === "reminders") {
      return renderRemindersScreen();
    }

    if (activeTab === "settings") {
      return renderSettingsScreen();
    }

    return renderHomeScreen();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8FB" />

      <KeyboardAvoidingView style={styles.keyboardView}>
        <View style={styles.appRoot}>{renderCurrentScreen()}</View>
        {renderBottomTabs()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>
        {icon} {title}
      </Text>
      <Text style={styles.infoCardText}>{text}</Text>
    </View>
  );
}

function MealInput({ label, value, onChangeText }) {
  const parsed = parseTimeValue(value);
  const initialMeridiem = parsed ? (parsed.hour < 12 ? "오전" : "오후") : "오전";
  const initialHour = parsed ? (parsed.hour % 12 === 0 ? 12 : parsed.hour % 12) : 8;
  const initialMinute = parsed ? parsed.minute : 0;

  const [isOpen, setIsOpen] = useState(false);
  const [draftMeridiem, setDraftMeridiem] = useState(initialMeridiem);
  const [draftHour, setDraftHour] = useState(initialHour);
  const [draftMinute, setDraftMinute] = useState(initialMinute);

  useEffect(() => {
    const nextParsed = parseTimeValue(value);

    if (nextParsed) {
      setDraftMeridiem(nextParsed.hour < 12 ? "오전" : "오후");
      setDraftHour(nextParsed.hour % 12 === 0 ? 12 : nextParsed.hour % 12);
      setDraftMinute(nextParsed.minute);
    }
  }, [value]);

  const saveSelectedTime = () => {
    let finalHour = draftHour % 12;

    if (draftMeridiem === "오후") {
      finalHour += 12;
    }

    onChangeText(`${String(finalHour).padStart(2, "0")}:${String(draftMinute).padStart(2, "0")}`);
    setIsOpen(false);
  };

  return (
    <View style={styles.mealInputRow}>
      <TouchableOpacity
        style={styles.mealCollapsedButton}
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.84}
      >
        <View style={styles.mealHeaderRow}>
          <Text style={styles.mealInputLabel}>{label}</Text>
          <Text style={styles.mealCurrentText}>
            {value ? formatTimeValueForDisplay(value) : "아직 설정하지 않음"}
          </Text>
        </View>
        <Text style={styles.mealOpenGuide}>
          {isOpen ? "시간 선택 닫기" : "눌러서 시간 선택하기"}
        </Text>
      </TouchableOpacity>

      {isOpen ? (
        <View style={styles.mealPickerBox}>
          <View style={styles.timeOptionGroup}>
            {meridiemOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.timeOptionButton,
                  draftMeridiem === option && styles.timeOptionButtonActive,
                ]}
                onPress={() => setDraftMeridiem(option)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    draftMeridiem === option && styles.timeOptionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timeOptionGroupWrap}>
            {hourOptions.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={[
                  styles.timeSmallOptionButton,
                  draftHour === hour && styles.timeOptionButtonActive,
                ]}
                onPress={() => setDraftHour(hour)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    draftHour === hour && styles.timeOptionTextActive,
                  ]}
                >
                  {hour}시
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timeOptionGroupWrap}>
            {minuteOptions.map((minute) => (
              <TouchableOpacity
                key={minute}
                style={[
                  styles.timeSmallOptionButton,
                  draftMinute === minute && styles.timeOptionButtonActive,
                ]}
                onPress={() => setDraftMinute(minute)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    draftMinute === minute && styles.timeOptionTextActive,
                  ]}
                >
                  {String(minute).padStart(2, "0")}분
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.timeSaveButton} onPress={saveSelectedTime}>
            <Text style={styles.timeSaveButtonText}>시간 저장하기</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function parseTimeValue(value) {
  if (!value) {
    return null;
  }

  const parts = String(value).split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return { hour, minute };
}

function formatTimeValueForDisplay(value) {
  const parsed = parseTimeValue(value);

  if (!parsed) {
    return "아직 설정하지 않음";
  }

  const meridiem = parsed.hour < 12 ? "오전" : "오후";
  const displayHour = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  const displayMinute = String(parsed.minute).padStart(2, "0");

  return `${meridiem} ${displayHour}시 ${displayMinute}분`;
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F8FB",
  },
  keyboardView: {
    flex: 1,
    backgroundColor: "#F4F8FB",
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
    width: 175,
    height: 175,
    marginBottom: 4,
  },
  homeMainText: {
    fontSize: 22,
    lineHeight: 36,
    fontWeight: "800",
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
    elevation: 3,
  },
  homeFeatureTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 12,
  },
  homeFeatureText: {
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
    fontSize: 23,
    fontWeight: "800",
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
    fontSize: 17,
    fontWeight: "800",
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
    fontSize: 30,
    fontWeight: "900",
    color: "#083A5A",
  },
  topBarTitleBox: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#083A5A",
  },
  topBarSubtitle: {
    fontSize: 14,
    fontWeight: "700",
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
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DFF1FA",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B5D83",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 17,
    lineHeight: 30,
    color: "#315B73",
    marginBottom: 16,
  },
  textArea: {
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
  },
  voiceBox: {
    backgroundColor: "#F8FBFD",
    borderRadius: 22,
    borderWidth: 1.6,
    borderColor: "#D8E7F0",
    padding: 16,
    marginTop: 2,
  },
  voiceTitle: {
    fontSize: 19,
    lineHeight: 30,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 6,
  },
  voiceDescription: {
    fontSize: 16,
    lineHeight: 28,
    color: "#315B73",
    marginBottom: 14,
  },
  voiceButtonRow: {
    flexDirection: "row",
  },
  voiceButton: {
    flex: 1,
    backgroundColor: "#DFF1FA",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.6,
    borderColor: "#8FC7DE",
    marginRight: 6,
  },
  voiceButtonActive: {
    backgroundColor: "#0B78A6",
  },
  voiceButtonText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    color: "#0B5D83",
    textAlign: "center",
  },
  voiceButtonTextActive: {
    color: "#FFFFFF",
  },
  voiceStopButton: {
    flex: 1,
    backgroundColor: "#FFF1F2",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.6,
    borderColor: "#FECACA",
    marginLeft: 6,
  },
  voiceStopButtonText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    color: "#B91C1C",
    textAlign: "center",
  },
  voiceResetButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.6,
    borderColor: "#BCD7E5",
    marginLeft: 6,
  },
  voiceResetButtonText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800",
    color: "#315B73",
    textAlign: "center",
  },
  photoButtonRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    backgroundColor: "#EFF7FB",
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#8FC7DE",
    marginHorizontal: 5,
  },
  photoButtonText: {
    fontSize: 18,
    fontWeight: "800",
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
    fontSize: 17,
    fontWeight: "800",
    color: "#083A5A",
  },
  photoRemoveText: {
    fontSize: 16,
    fontWeight: "800",
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
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 17,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
  },
  clearButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#315B73",
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
    fontSize: 21,
    lineHeight: 32,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 10,
  },
  summaryText: {
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
    fontSize: 21,
    lineHeight: 32,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 13,
    paddingBottom: 11,
    borderBottomWidth: 2,
    borderBottomColor: "#EFF7FB",
  },
  infoCardText: {
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
    fontSize: 17,
    fontWeight: "800",
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
    fontSize: 17,
    fontWeight: "800",
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
    fontSize: 17,
    fontWeight: "800",
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
  draftTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 8,
  },
  medicinePurposeText: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF7EF",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "800",
    color: "#14532D",
    marginBottom: 8,
  },
  draftMedicine: {
    fontSize: 17,
    lineHeight: 28,
    color: "#17384A",
  },
  mealInputRow: {
    marginBottom: 18,
    backgroundColor: "#F8FBFD",
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
    padding: 14,
  },
  mealHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mealInputLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "#083A5A",
  },
  mealCurrentText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B78A6",
  },
  timeOptionGroup: {
    flexDirection: "row",
    marginBottom: 10,
  },
  timeOptionGroupWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  timeOptionButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.4,
    borderColor: "#BCD7E5",
    marginHorizontal: 4,
  },
  timeSmallOptionButton: {
    width: "23%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.3,
    borderColor: "#BCD7E5",
    margin: "1%",
  },
  timeOptionButtonActive: {
    backgroundColor: "#0B78A6",
    borderColor: "#0B78A6",
  },
  timeOptionText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#315B73",
  },
  timeOptionTextActive: {
    color: "#FFFFFF",
  },
  mealInput: {
    backgroundColor: "#F8FBFD",
    borderRadius: 18,
    borderWidth: 1.6,
    borderColor: "#BCD7E5",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2535",
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
    width: 118,
    fontSize: 20,
    fontWeight: "900",
    color: "#0B78A6",
  },
  planTextBox: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 4,
  },
  planBody: {
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
    fontSize: 15,
    fontWeight: "800",
    color: "#0B78A6",
    marginBottom: 8,
  },
  recordTitle: {
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
    fontSize: 16,
    fontWeight: "800",
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
    fontSize: 16,
    fontWeight: "800",
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
    fontSize: 24,
    fontWeight: "900",
    color: "#0B78A6",
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 6,
  },
  reminderBody: {
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
    fontSize: 21,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
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
    fontSize: 16,
    lineHeight: 26,
    color: "#14532D",
  },
  shareNoticeBox: {
    marginBottom: 18,
    backgroundColor: "#DFF1FA",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#8FC7DE",
  },
  shareNoticeText: {
    fontSize: 16,
    lineHeight: 28,
    color: "#083A5A",
  },
  familyMessageBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
  },
  familyMessageTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#083A5A",
    marginBottom: 14,
  },
  familyMessageText: {
    fontSize: 16,
    lineHeight: 30,
    color: "#17384A",
  },
  testNotificationButton: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#8FC7DE",
  },
  testNotificationButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B5D83",
  },
  recordDetailText: {
    fontSize: 17,
    lineHeight: 30,
    color: "#17384A",
    backgroundColor: "#F8FBFD",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.2,
    borderColor: "#D8E7F0",
    marginBottom: 14,
  },
  savedPhotoBox: {
    marginTop: 8,
  },
  mealCollapsedButton: {
    backgroundColor: "#F8FBFD",
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: "#BCD7E5",
    padding: 14,
  },
  mealOpenGuide: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B78A6",
    marginTop: 8,
  },
  mealPickerBox: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#D8E7F0",
    padding: 12,
  },
  timeSaveButton: {
    marginTop: 10,
    backgroundColor: "#0B78A6",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  timeSaveButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
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
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7C8D",
  },
  tabLabelActive: {
    color: "#0B5D83",
  },
});