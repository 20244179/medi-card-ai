import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import AsyncStorage from "@react-native-async-storage/async-storage";


const LOGO = require("./assets/mydoctor-logo.png");


const STORAGE_KEYS = {
  records: "MYDOCTOR_RECORDS",
  reminders: "MYDOCTOR_REMINDER_DRAFTS",
  mealTimes: "MYDOCTOR_MEAL_TIMES",
};

const defaultMealTimes = {
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
};

const defaultResult = {
  summary:
    "진료 ?�용???�력?�거????봉투 ?�진???�으�? ?�늘 �?기억?�야 ???�심???�게 ?�리?�드립니??",
  disease:
    "진료 ?�용???�력?�고 버튼???�르�? ?�자 ?�높?�에 맞춘 ?�명???�옵?�다.",
  medicine:
    "처방받�? ?�을 ?�제, ?�떻�?먹어???�는지 ?�게 ?�리?�드립니??",
  caution:
    "?�활?�서 조심?�야 ???�을 ?�자 ?�높?�에 맞게 ?�리?�드립니??",
  hospital:
    "?�시 병원??가???�는 ?�황?�나 ?�진 ?�정???�리?�드립니??",
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
  const [medicineHintType, setMedicineHintType] = useState("unknown");

  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [mealTimes, setMealTimes] = useState(defaultMealTimes);
  const [reminderDrafts, setReminderDrafts] = useState([]);
  const [familyMessage, setFamilyMessage] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    loadStoredData();
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
    } catch (error) {}
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

  const saveMealTimes = async (nextMealTimes) => {
    setMealTimes(nextMealTimes);
    await AsyncStorage.setItem(
      STORAGE_KEYS.mealTimes,
      JSON.stringify(nextMealTimes)
    );
  };

  const normalizeText = (text) => {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  const compactText = (text) => {
    return normalizeText(text)
      .replace(/[\s\-_().,[\]{}<>]/g, "")
      .replace(/mg/g, "")
      .replace(/??g, "")
      .replace(/?�제/g, "")
      .replace(/?�방/g, "")
      .replace(/?�름코팅/g, "");
  };

  const detectMedicineType = (text = "") => {
    const combined = normalizeText(text);
    const compact = compactText(text);

    const includesAny = (keywords) =>
      keywords.some((word) => {
        const normal = normalizeText(word);
        const compactWord = compactText(word);
        return combined.includes(normal) || compact.includes(compactWord);
      });

    const diabetesKeywords = [
      "?�뇨",
      "?�뇨�?,
      "?�당",
      "?�당조절",
      "?�당 조절",
      "?�슐�?,
      "메트?�르�?,
      "?�이?�벡??,
      "글루파",
      "글루파850",
      "glupa",
      "glupa850",
      "?�이?��??�론",
      "?�아미크�?,
      "?�이?��??�론?�알",
      "?�아미크론엠??,
      "diamicron",
      "diamicronmr",
      "diamicron mr",
      "gliclazide",
      "gliclazide mr",
      "metformin",
      "insulin",
      "glucose",
      "diabetes",
    ];

    const bpKeywords = [
      "고혈??,
      "?�압",
      "?�로?��?",
      "?�바?�크",
      "로사르탄",
      "발사르탄",
      "?��??�르??,
      "amlodipine",
      "losartan",
      "valsartan",
      "telmisartan",
      "hypertension",
      "blood pressure",
    ];

    const refluxKeywords = [
      "??��",
      "?�쓰�?,
      "???�림",
      "?�도??,
      "?�산",
      "?�산분비?�제",
      "ppi",
      "?�메?�라�?,
      "?�토?�라�?,
      "?�?�프?�졸",
      "?�베?�라�?,
      "omeprazole",
      "pantoprazole",
      "lansoprazole",
      "rabeprazole",
      "reflux",
    ];

    if (includesAny(diabetesKeywords)) return "diabetes";
    if (includesAny(bpKeywords)) return "bloodPressure";
    if (includesAny(refluxKeywords)) return "reflux";

    return "unknown";
  };

  const getMedicineAnalysisText = (type) => {
    if (type === "diabetes") {
      return {
        title: "?�뇨???�는 ?�당 조절 ?�서가 ?�인?�었?�니??",
        message:
          "?�마??복용 ?�간???��? ???�습?�다.\n??봉투??복용법을 �??�인?�주?�요.\n?��??�, ?�떨�? ?�한 ?��??��??� ?�?�당 증상?????�습?�다.",
      };
    }

    if (type === "bloodPressure") {
      return {
        title: "?�압??관???�서가 ?�인?�었?�니??",
        message:
          "?�압?��? 매일 같�? ?�간??꾸�????�시??것이 중요?�니??\n증상???�다�??�의�?중단?�면 ?�압???�시 ?�라�????�습?�다.",
      };
    }

    if (type === "reflux") {
      return {
        title: "?�산 ?�제??관???�서가 ?�인?�었?�니??",
        message:
          "?�산??줄이???��? ?�사 ??복용??중요??경우가 많습?�다.\n?�확??복용법�? ??봉투?� 처방?�을 ?�께 ?�인?�주?�요.",
      };
    }

    return {
      title: "??봉투 ?�진??첨�??�었?�니??",
      message:
        "???�름�?복용 ?�간????보이?�록 촬영???�진?�면 복약 ?�명???��????�니??\n진료 ?�용???�께 ?�력?�면 ???�확???�리?????�습?�다.",
    };
  };

  const generateReminderDrafts = (type, text = "") => {
    const detected = type !== "unknown" ? type : detectMedicineType(text);

    if (detected === "diabetes") {
      return [
        {
          id: "morning-before",
          label: "?�침 ?�전 30�?,
          meal: "breakfast",
          offsetMinutes: -30,
          medicines: ["DiAMiCRON MR", "Dexima"],
        },
        {
          id: "morning-after",
          label: "?�침 ?�후 30�?,
          meal: "breakfast",
          offsetMinutes: 30,
          medicines: ["Rosuzet"],
        },
        {
          id: "breakfast-dinner-after",
          label: "?�침, ?�???�사 직후",
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
          label: "?�침 ?�후 30�?,
          meal: "breakfast",
          offsetMinutes: 30,
          medicines: ["?�압??],
        },
      ];
    }

    if (detected === "reflux") {
      return [
        {
          id: "morning-reflux",
          label: "?�침 ?�전 30�?,
          meal: "breakfast",
          offsetMinutes: -30,
          medicines: ["?�산 ?�제??],
        },
      ];
    }

    return [
      {
        id: "general-after",
        label: "?�후 복용 ?�림",
        meal: "breakfast",
        offsetMinutes: 30,
        medicines: ["??봉투?�서 ?�인????],
      },
    ];
  };

  const parseTime = (timeText) => {
    const [h, m] = String(timeText || "08:00")
      .split(":")
      .map((v) => Number(v));

    return {
      hour: Number.isFinite(h) ? h : 8,
      minute: Number.isFinite(m) ? m : 0,
    };
  };

  const addMinutesToTime = (timeText, offsetMinutes) => {
    const { hour, minute } = parseTime(timeText);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    date.setMinutes(date.getMinutes() + offsetMinutes);

    return {
      hour: date.getHours(),
      minute: date.getMinutes(),
      text: `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`,
    };
  };

  const buildNotificationPlans = (drafts, currentMealTimes) => {
    const plans = [];

    drafts.forEach((draft) => {
      const addPlan = (mealKey, suffix = "") => {
        const baseTime = currentMealTimes[mealKey] || defaultMealTimes[mealKey];
        const computed = addMinutesToTime(baseTime, draft.offsetMinutes);

        plans.push({
          id: `${draft.id}-${mealKey}-${Date.now()}`,
          label: `${draft.label}${suffix}`,
          timeText: computed.text,
          hour: computed.hour,
          minute: computed.minute,
          medicines: draft.medicines,
        });
      };

      if (draft.meal === "breakfastDinner") {
        addPlan("breakfast", " · ?�침");
        addPlan("dinner", " · ?�??);
      } else {
        addPlan(draft.meal);
      }
    });

    return plans;
  };

  const processPickedImage = (asset, sourceLabel) => {
    if (!asset?.uri) return;

    const name =
      asset.fileName ||
      asset.uri?.split("/")?.pop() ||
      `${sourceLabel}_medicine_bag.jpg`;

    setMedicinePhotoUri(asset.uri);
    setMedicinePhotoName(name);

    const detectedType = detectMedicineType(`${name} ${userInput}`);
    const analysis = getMedicineAnalysisText(detectedType);

    setMedicineHintType(detectedType);
    setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
    setReminderDrafts(generateReminderDrafts(detectedType, `${name} ${userInput}`));
  };

  const handleSelectMedicinePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "?�진 ?�근 권한 ?�요",
        "??봉투 ?�진???�택?�려�??�진 ?�근 권한???�용?�주?�요."
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!pickerResult.canceled) {
      processPickedImage(pickerResult.assets?.[0], "selected");
    }
  };

  const handleCaptureMedicinePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "카메??권한 ?�요",
        "??봉투�?촬영?�려�?카메??권한???�용?�주?�요."
      );
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!cameraResult.canceled) {
      processPickedImage(cameraResult.assets?.[0], "captured");
    }
  };

  const handleRemoveMedicinePhoto = () => {
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("unknown");
    setReminderDrafts([]);
  };

  const buildResultByType = (type) => {
    if (type === "diabetes") {
      return {
        summary:
          "?�뇨???�는 ?�당 조절 ?�서가 ?�인?�었?�니??\n??복용 ?�간�??�사 ?�간???�께 지?�는 것이 중요?�니??",
        disease:
          "?�뇨병�? ?�액 ???�도?? �??�당???�게 ?��??�는 병입?�다. ?�당???�래 ?�으�??? 콩팥, ?�경, ?��???문제가 ?�길 ???�어 꾸�???관리�? ?�요?�니??",
        medicine:
          "?�뇨?��? ??종류???�라 복용 ?�간???��? ???�습?�다. ?�전, ?�후 복용법을 ??봉투?�서 �??�인?�주?�요. ?�사�?거른 ?�태?�서 ?�을 먹으�??�?�당???�길 ???�습?�다.",
        caution:
          "?�사�?거르지 ?�고 규칙?�으�??�시??것이 중요?�니?? ???�료??과도??간식?� 줄이�? ?�당??기록?�면 치료 조절???��????�니??",
        hospital:
          "?��??�, ?�떨�? ?�한 ?��??��?, ?�식???�려지??증상?� ?�?�당?????�습?�다. ?�런 증상??반복?�거???�당???�무 ?�게 ?��??�면 병원??문의?�주?�요.",
      };
    }

    if (type === "bloodPressure") {
      return {
        summary:
          "?�압??관???�서가 ?�인?�었?�니??\n증상???�어??매일 같�? ?�간??복용?�는 것이 중요?�니??",
        disease:
          "고혈?��? ?��? ?�의 ?�력??계속 ?��? ?�태?�니?? 증상???�어???�래 지?�되�??�장, ?�혈관, 콩팥??부?�을 �????�습?�다.",
        medicine:
          "?�압?��? 매일 같�? ?�간??꾸�????�시??것이 중요?�니?? 증상???�다�??�의�??�으�??�압???�시 ?�라�????�습?�다.",
        caution:
          "�??�식?� 줄이�? 규칙?�인 ?�동�?체중 관리�? ?��????�니?? 집에???�압???�서 기록?�면 진료 ???��????�니??",
        hospital:
          "?�한 ?�통, 가?�통�? ?�참, ?�쪽 ?�다�?마비, 말이 ?�눌?��???증상???�으�?바로 진료�?받아???�니??",
      };
    }

    if (type === "reflux") {
      return {
        summary:
          "?�산 ?�는 ??��???�도??관???�서가 ?�인?�었?�니??\n??복용 ?�간�??�습관???�께 ?�인?�는 것이 중요?�니??",
        disease:
          "??��???�도?��? ?�산?�나 ?�식물이 ?�도�?거꾸�??�라?�는 병입?�다. 가???�림?�나 ?�물???�라?�는 증상???�길 ???�습?�다.",
        medicine:
          "?�산??줄이???��? ?�사 ?�에 복용?????�과가 좋�? 경우가 많습?�다. ?�확??복용 ?�간?� ??봉투?� 처방?�을 ?�인?�주?�요.",
        caution:
          "매운 ?�식, 카페?? 기름�??�식, ?��? ?�하??것이 좋습?�다. ?�사 ??바로 ?��? 말고, ?�자�??�에???�식??줄이??것이 ?��????�니??",
        hospital:
          "증상??계속?�거?????�해지�?병원???�시 방문?�야 ?�니?? ?��? ?�하거나 검?� 변??보거???�키�??�들�?빨리 진료�?받아???�니??",
      };
    }

    if (medicinePhotoUri && !userInput.trim()) {
      return {
        summary:
          "??봉투 ?�진??첨�??�었?�니??\n???�름�?복용법�? ??봉투?� 처방?�을 ?�께 ?�인?�주?�요.",
        disease:
          "?�재??진료 ?�용???�력?��? ?�아 ?�확??병명?� ?????�습?�다. 병명?�나 증상???�께 ?�력?�면 ??구체?�인 ?�명??받을 ???�습?�다.",
        medicine:
          medicinePhotoAnalysis ||
          "??봉투 ?�진??첨�??�었?�니?? ???�름, ?�량, 복용 ?�간?� ??봉투?� 처방?�을 기�??�로 ?�인?�야 ?�니??",
        caution:
          "?�진만으�??�을 ?�의�??�단?�거??복용법을 바꾸�????�니?? ???�름???�갈리거??복용 ?�간???��? 경우?�는 ?�국?�나 병원???�인?�는 것이 ?�전?�니??",
        hospital:
          "?�을 먹�? ???�드?�기, ?�흡곤�?, ?�한 ?��??��?, ?�술?�나 ?�굴??붓는 증상???�기�?즉시 진료�?받아???�니??",
      };
    }

    return {
      summary:
        "?�력?�신 진료 ?�용??바탕?�로 ?�리?�습?�다.\n?�확???�용?� 처방?�과 ?�료�??�명???�께 ?�인?�주?�요.",
      disease:
        "?�력?�신 진료 ?�용??바탕?�로 보면, ?�재 증상�??�사 ?�생?�의 ?�명???�게 ?�리???�해?�는 것이 중요?�니?? ?�확??진단명�? ?�료진의 ?�명�?처방?�을 ?�께 ?�인?�주?�요.",
      medicine:
        "?��? 처방받�? ?�법�??�량??맞춰 복용?�야 ?�니?? ?�전, ?�후, ?�기 ????복용 ?�간???��? ???�으므�???봉투??처방?�을 �??�인?�주?�요.",
      caution:
        "?�활?��? 관리나 ?�식 조절???�???�명???�었?�면 ??지?�는 것이 좋습?�다. 증상??갑자�??�해지거나 ?�소?� ?�른 증상???�기�?병원??문의?�주?�요.",
      hospital:
        "?�흡곤�?, ?�한 ?�증, 고열, ?�식 ?�?? ?�한 ?�레르기 반응???�기�?바로 병원??문의?�야 ?�니?? ?�진 ?�정???�내?�었?�면 �?지켜주?�요.",
    };
  };

  const handleTranslate = () => {
    if (!userInput.trim() && !medicinePhotoUri) {
      Alert.alert("?�력 ?�요", "진료 ?�용 ?�는 ??봉투 ?�진??먼�? ?�어주세??");
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
    }, 600);
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
      medicineHintType,
    };

    const nextRecords = [newRecord, ...records];
    await saveRecords(nextRecords);

    Alert.alert("?�???�료", "진료 기록???�?�되?�습?�다.");
  };

  const openRecord = (record) => {
    setEditingRecord(record);
    setUserInput(record.input || "");
    setResult(record.result || defaultResult);
    setMedicinePhotoUri(record.medicinePhotoUri || "");
    setMedicinePhotoName(record.medicinePhotoName || "");
    setMedicinePhotoAnalysis(record.medicinePhotoAnalysis || "");
    setMedicineHintType(record.medicineHintType || "unknown");
    setReminderDrafts(
      generateReminderDrafts(record.medicineHintType, record.input || "")
    );
    setActiveTab("home");
    setScreen("result");
  };

  const deleteRecord = async (recordId) => {
    const nextRecords = records.filter((item) => item.id !== recordId);
    await saveRecords(nextRecords);
  };

  const buildFamilyMessage = () => {
    const photoLine = medicinePhotoAnalysis
      ? `\n첨�? ??봉투 참고:\n${medicinePhotoAnalysis}\n`
      : "";

    return `[진료 ?�용 ?�약]

?�늘???�심:
${result.summary}

1. 무슨 병인가??
${result.disease}

2. ?��? ?�떻�?먹어???�나??
${result.medicine}

3. 무엇??조심?�야 ?�나??
${result.caution}

4. ?�제 ?�시 병원??가???�나??
${result.hospital}
${photoLine}
?????�용?� 진료 ?�용???�게 ?�리??보조 ?�명?�며, ?�확???�용?� 처방?�과 ?�료�??�명???�께 ?�인?�주?�요.`;
  };

  const handleNotifyFamily = async () => {
    const message = buildFamilyMessage();
    setFamilyMessage(message);
    setScreen("share");
    setActiveTab("home");

    try {
      await Share.share({
        title: "진료 ?�용 ?�약",
        message,
      });
    } catch (error) {}
  };

  const saveReminderPlans = async () => {
    const plans = buildNotificationPlans(reminderDrafts, mealTimes).map((plan) => ({
      ...plan,
      createdAt: new Date().toISOString(),
    }));

    const nextReminders = [...plans, ...reminders];
    await saveReminders(nextReminders);

    Alert.alert(
      "???�림 초안 ?�??,
      "복용 ?�간 초안???�?�되?�습?�다.\n?�제 ?�시 ?�림?� ?�음 ?�계?�서 ?�결?�니??"
    );

    setActiveTab("reminders");
    setScreen("reminders");
  };

  const deleteReminder = async (id) => {
    const nextReminders = reminders.filter((item) => item.id !== id);
    await saveReminders(nextReminders);
  };

  const handleClear = () => {
    setUserInput("");
    setResult(defaultResult);
    setIsLoading(false);
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("unknown");
    setReminderDrafts([]);
    setFamilyMessage("");
    setEditingRecord(null);
    setScreen("input");
    setActiveTab("home");
  };

  const resetAllAndGoHome = () => {
    setUserInput("");
    setResult(defaultResult);
    setIsLoading(false);
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("unknown");
    setReminderDrafts([]);
    setFamilyMessage("");
    setEditingRecord(null);
    setScreen("home");
    setActiveTab("home");
  };

  const openReminderSetup = () => {
    const finalType =
      medicineHintType !== "unknown"
        ? medicineHintType
        : detectMedicineType(`${userInput} ${medicinePhotoName}`);

    const drafts = generateReminderDrafts(finalType, userInput);
    setReminderDrafts(drafts);
    setScreen("reminderSetup");
    setActiveTab("home");
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}.${String(date.getDate()).padStart(2, "0")}`;
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
          <Text style={styles.backIconText} numberOfLines={1}>
            ??
          </Text>
        </TouchableOpacity>

        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.topBarSubtitle} numberOfLines={1}>
            MyDoctor
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoMini}
          onPress={resetAllAndGoHome}
          activeOpacity={0.82}
        >
          <Image source={LOGO} style={styles.logoMiniImage} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderBottomTabs = () => {
    const tabs = [
      { key: "home", label: "??, icon: "?��" },
      { key: "records", label: "기록", icon: "?��" },
      { key: "reminders", label: "???�림", icon: "?��" },
      { key: "settings", label: "?�정", icon: "?�️" },
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
              <Text style={styles.tabIcon} numberOfLines={1}>
                {tab.icon}
              </Text>
              <Text
                style={[styles.tabLabel, focused && styles.tabLabelActive]}
                numberOfLines={1}
              >
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
            진료?�에???��? ?�려??말을{"\n"}?�게 ?�리?�드?�요
          </Text>

          <View style={styles.homeFeatureBox}>
            <Text style={styles.homeFeatureTitle} numberOfLines={1}>
              ???�으�??????�는 ??
            </Text>
            <Text style={styles.homeFeatureText}>???�려??진료 ?�용???�게 보기</Text>
            <Text style={styles.homeFeatureText}>??가족에�??�약�?보내�?/Text>
            <Text style={styles.homeFeatureText}>?????�림 ?�간 ?�정?�기</Text>
            <Text style={styles.homeFeatureText}>??진료 기록 ?�시 ?�인?�기</Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              setScreen("input");
              setActiveTab("home");
            }}
          >
            <Text style={styles.startButtonText} numberOfLines={1}>
              ??진료 ?�리?�기
            </Text>
          </TouchableOpacity>

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                setActiveTab("records");
                setScreen("records");
              }}
            >
              <Text style={styles.quickButtonText} numberOfLines={1}>
                기록 보기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                setActiveTab("reminders");
                setScreen("reminders");
              }}
            >
              <Text style={styles.quickButtonText} numberOfLines={1}>
                ???�림 보기
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderInputScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("진료 ?�용 ?�력", "home")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText} numberOfLines={1}>
              1?�계
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>진료 ?�용???�어주세??/Text>
            <Text style={styles.sectionDescription}>
              병원?�서 ?��? 말이?????�름??짧게 ?�어???�니??
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
              placeholder="?? ?�뇨 ?�문??병원??갔고 ?�을 받았?�요. ?�후??먹으?�고 ?�셨?�요."
              placeholderTextColor="#6B7C8D"
            />
          </View>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText} numberOfLines={1}>
              2?�계
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>??봉투 ?�진???�어주세??/Text>
            <Text style={styles.sectionDescription}>
              ??봉투 ?�진?� 복약 ?�명�??�림 초안???�께 ?�시?�니??
            </Text>

            <View style={styles.photoButtonRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleSelectMedicinePhoto}
              >
                <Text style={styles.photoButtonText} numberOfLines={1}>
                  ?���??�진 ?�택
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleCaptureMedicinePhoto}
              >
                <Text style={styles.photoButtonText} numberOfLines={1}>
                  ?�� 촬영?�기
                </Text>
              </TouchableOpacity>
            </View>

            {medicinePhotoUri ? (
              <View style={styles.photoPreviewBox}>
                <View style={styles.photoPreviewHeader}>
                  <Text style={styles.photoPreviewTitle} numberOfLines={1}>
                    첨�?????봉투 ?�진
                  </Text>
                  <TouchableOpacity onPress={handleRemoveMedicinePhoto}>
                    <Text style={styles.photoRemoveText} numberOfLines={1}>
                      ??��
                    </Text>
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
                <Text style={styles.emptyPhotoIcon} numberOfLines={1}>
                  ?��
                </Text>
                <Text style={styles.emptyPhotoText}>
                  ??봉투 ?�진???�으�?"\n"}복약 ?�명???�께 반영?�니??
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.mainButton, isLoading && styles.loadingButton]}
            onPress={handleTranslate}
            disabled={isLoading}
          >
            <Text style={styles.mainButtonText} numberOfLines={2}>
              {isLoading
                ? "진료 ?�용???�운 ?�명 카드�??�리?�고 ?�습?�다."
                : "AI�??�게 ?�리?�기"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText} numberOfLines={1}>
              ?�체 ?�력 지?�기
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderResultScreen = () => {
    return (
      <View style={styles.appScreen}>
        {renderTopBar("?�운 ?�명 카드", "input")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          {editingRecord ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                ?�?�된 진료 기록???�시 보고 ?�습?�다.
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>?�� ?�늘 �?기억???�용</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </View>

          <InfoCard icon="?��" title="무슨 병인가??" text={result.disease} />
          <InfoCard icon="?��" title="?��? ?�떻�?먹나??" text={result.medicine} />
          <InfoCard icon="?�️" title="무엇??조심?�나??" text={result.caution} />
          <InfoCard icon="?��" title="?�제 병원???�시 가?�요?" text={result.hospital} />

          <View style={styles.actionPanel}>
            <TouchableOpacity style={styles.familyButton} onPress={handleNotifyFamily}>
              <Text style={styles.familyButtonText} numberOfLines={1}>
                가족에�??�리�?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.alarmButton} onPress={openReminderSetup}>
              <Text style={styles.alarmButtonText} numberOfLines={1}>
                ???�림 ?�정
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveCurrentRecord}>
            <Text style={styles.saveButtonText} numberOfLines={1}>
              진료 기록 ?�?�하�?
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderReminderSetupScreen = () => {
    const plans = buildNotificationPlans(reminderDrafts, mealTimes);

    return (
      <View style={styles.appScreen}>
        {renderTopBar("???�림 ?�정", "result")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>AI가 ?�림 초안??만들?�습?�다</Text>
            <Text style={styles.sectionDescription}>
              ??봉투?� ?�력??진료 ?�용??바탕?�로 준비했?�니?? 복용 ?�간?� ??봉투?� ??�????�인?�주?�요.
            </Text>

            {reminderDrafts.map((draft) => (
              <View key={draft.id} style={styles.draftCard}>
                <Text style={styles.draftTitle}>{draft.label}</Text>
                {draft.medicines.map((med) => (
                  <Text key={med} style={styles.draftMedicine}>
                    - {med}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>?�사 ?�간???�려주세??/Text>
            <Text style={styles.sectionDescription}>
              ?�전·?�후 ?�림 ?�간???�동?�로 계산?�니??
            </Text>

            <MealInput
              label="?�침 ?�사"
              value={mealTimes.breakfast}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, breakfast: text })
              }
            />
            <MealInput
              label="?�심 ?�사"
              value={mealTimes.lunch}
              onChangeText={(text) => saveMealTimes({ ...mealTimes, lunch: text })}
            />
            <MealInput
              label="?�???�사"
              value={mealTimes.dinner}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, dinner: text })
              }
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>?�?�될 ?�림 초안</Text>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.planRow}>
                <Text style={styles.planTime}>{plan.timeText}</Text>
                <View style={styles.planTextBox}>
                  <Text style={styles.planTitle}>{plan.label}</Text>
                  <Text style={styles.planBody}>{plan.medicines.join(", ")}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={saveReminderPlans}>
            <Text style={styles.mainButtonText} numberOfLines={1}>
              ?�림 초안 ?�?�하�?
            </Text>
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
              icon="?��"
              title="?�?�된 기록???�습?�다"
              text="진료 ?�용???�리????기록 ?�?�하기�? ?�러주세??"
            />
          ) : (
            records.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <Text style={styles.recordDate}>{formatDate(record.createdAt)}</Text>
                <Text style={styles.recordTitle} numberOfLines={3}>
                  {record.result?.summary || "진료 기록"}
                </Text>
                <View style={styles.recordButtonRow}>
                  <TouchableOpacity
                    style={styles.recordOpenButton}
                    onPress={() => openRecord(record)}
                  >
                    <Text style={styles.recordOpenText} numberOfLines={1}>
                      ?�시 보기
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recordDeleteButton}
                    onPress={() => deleteRecord(record.id)}
                  >
                    <Text style={styles.recordDeleteText} numberOfLines={1}>
                      ??��
                    </Text>
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
        {renderTopBar("???�림 관�?, "tab-home")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              ?�재 버전?�서???�림 초안???�?�합?�다. ?�제 ?�시 ?�림?� ?�음 ?�계?�서 ?�결?�니??
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>기본 ?�사 ?�간</Text>
            <Text style={styles.sectionDescription}>
              ?�사 ?�간??바뀌면 ?�기?�서 ?�정?????�습?�다.
            </Text>

            <MealInput
              label="?�침 ?�사"
              value={mealTimes.breakfast}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, breakfast: text })
              }
            />
            <MealInput
              label="?�심 ?�사"
              value={mealTimes.lunch}
              onChangeText={(text) => saveMealTimes({ ...mealTimes, lunch: text })}
            />
            <MealInput
              label="?�???�사"
              value={mealTimes.dinner}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, dinner: text })
              }
            />
          </View>

          {reminders.length === 0 ? (
            <EmptyState
              icon="?��"
              title="?�?�된 ?�림 초안???�습?�다"
              text="?�운 ?�명 카드?�서 ???�림 ?�정???�러 ?�림 초안??만들 ???�습?�다."
            />
          ) : (
            reminders.map((item) => (
              <View key={item.id} style={styles.reminderCard}>
                <Text style={styles.reminderTime}>{item.timeText}</Text>
                <Text style={styles.reminderTitle}>{item.label}</Text>
                <Text style={styles.reminderBody}>{item.medicines.join(", ")}</Text>

                <TouchableOpacity
                  style={styles.recordDeleteButton}
                  onPress={() => deleteReminder(item.id)}
                >
                  <Text style={styles.recordDeleteText} numberOfLines={1}>
                    ?�림 ??��
                  </Text>
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
        {renderTopBar("?�정", "tab-home")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>기본 ?�사 ?�간</Text>
            <Text style={styles.sectionDescription}>
              ???�림 초안??만들 ???�용?�는 기�? ?�간?�니??
            </Text>

            <MealInput
              label="?�침 ?�사"
              value={mealTimes.breakfast}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, breakfast: text })
              }
            />
            <MealInput
              label="?�심 ?�사"
              value={mealTimes.lunch}
              onChangeText={(text) => saveMealTimes({ ...mealTimes, lunch: text })}
            />
            <MealInput
              label="?�???�사"
              value={mealTimes.dinner}
              onChangeText={(text) =>
                saveMealTimes({ ...mealTimes, dinner: text })
              }
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>???�보</Text>
            <Text style={styles.sectionDescription}>
              마이?�터??진료 ?�용???�게 ?�리?�고, 가�?공유?� ???�림???��?주는 AI 보조 ?�입?�다.
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
        {renderTopBar("보호?�에�?보내�?, "result")}

        <ScrollView contentContainerStyle={styles.screenBody}>
          <View style={styles.shareNoticeBox}>
            <Text style={styles.shareNoticeText}>
              ?�래 ?�용??복사?�거??공유 버튼???�러 가족에�??�달?�주?�요.
            </Text>
          </View>

          <View style={styles.familyMessageBox}>
            <Text style={styles.familyMessageTitle} numberOfLines={1}>
              보호?�용 ?�약�?
            </Text>
            <Text style={styles.familyMessageText}>{message}</Text>
          </View>

          <TouchableOpacity style={styles.familyButtonLarge} onPress={handleNotifyFamily}>
            <Text style={styles.familyButtonText} numberOfLines={1}>
              공유?�기 / ?�시 보내�?
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8FB" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
  return (
    <View style={styles.mealInputRow}>
      <Text style={styles.mealInputLabel} numberOfLines={1}>
        {label}
      </Text>
      <TextInput
        style={styles.mealInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="08:00"
        keyboardType="numbers-and-punctuation"
        placeholderTextColor="#8AA8B8"
      />
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

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: "#F4F8FB",
  },
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
  homeMainText: {    fontSize: 22,
    lineHeight: 36,
    color: "#083A5A",
    textAlign: "center",
    letterSpacing: -0.3,
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
  homeFeatureTitle: {    fontSize: 21,
    color: "#083A5A",
    marginBottom: 12,
  },
  homeFeatureText: {    fontSize: 18,
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
  startButtonText: {    fontSize: 23,
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
  quickButtonText: {    fontSize: 17,
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
  backIconText: {    fontSize: 30,
    color: "#083A5A",
  },
  topBarTitleBox: {
    flex: 1,
  },
  topBarTitle: {    fontSize: 23,
    color: "#083A5A",
  },
  topBarSubtitle: {    fontSize: 14,
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
  stepBadgeText: {    fontSize: 16,
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
  sectionTitle: {    fontSize: 22,
    lineHeight: 34,
    color: "#083A5A",
    marginBottom: 10,
  },
  sectionDescription: {    fontSize: 17,
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
    padding: 16,    fontSize: 18,
    lineHeight: 32,
    color: "#0B2535",
    marginBottom: 18,
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
  photoButtonText: {    fontSize: 18,
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
  photoPreviewTitle: {    fontSize: 17,
    color: "#083A5A",
  },
  photoRemoveText: {    fontSize: 16,
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
  photoAnalysisText: {    fontSize: 17,
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
  emptyPhotoIcon: {    fontSize: 42,
    marginBottom: 10,
  },
  emptyPhotoText: {    fontSize: 17,
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
  mainButtonText: {    fontSize: 21,
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
  clearButtonText: {    fontSize: 17,
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
  summaryTitle: {    fontSize: 21,
    lineHeight: 32,
    color: "#083A5A",
    marginBottom: 10,
  },
  summaryText: {    fontSize: 18,
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
  infoCardTitle: {    fontSize: 21,
    lineHeight: 32,
    color: "#083A5A",
    marginBottom: 13,
    paddingBottom: 11,
    borderBottomWidth: 2,
    borderBottomColor: "#EFF7FB",
  },
  infoCardText: {    fontSize: 17,
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
  familyButtonText: {    fontSize: 17,
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
  alarmButtonText: {    fontSize: 17,
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
  saveButtonText: {    fontSize: 17,
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
  draftTitle: {    fontSize: 18,
    color: "#083A5A",
    marginBottom: 8,
  },
  draftMedicine: {    fontSize: 17,
    lineHeight: 28,
    color: "#17384A",
  },
  mealInputRow: {
    marginBottom: 14,
  },
  mealInputLabel: {    fontSize: 17,
    color: "#083A5A",
    marginBottom: 8,
  },
  mealInput: {
    backgroundColor: "#F8FBFD",
    borderRadius: 18,
    borderWidth: 1.6,
    borderColor: "#BCD7E5",
    paddingVertical: 14,
    paddingHorizontal: 16,    fontSize: 20,
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
    width: 68,    fontSize: 20,
    color: "#0B78A6",
  },
  planTextBox: {
    flex: 1,
  },
  planTitle: {    fontSize: 16,
    color: "#083A5A",
    marginBottom: 4,
  },
  planBody: {    fontSize: 16,
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
  recordDate: {    fontSize: 15,
    color: "#0B78A6",
    marginBottom: 8,
  },
  recordTitle: {    fontSize: 17,
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
  recordOpenText: {    fontSize: 16,
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
  recordDeleteText: {    fontSize: 16,
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
  reminderTime: {    fontSize: 26,
    color: "#0B78A6",
    marginBottom: 8,
  },
  reminderTitle: {    fontSize: 18,
    color: "#083A5A",
    marginBottom: 6,
  },
  reminderBody: {    fontSize: 17,
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
  emptyStateTitle: {    fontSize: 21,
    color: "#083A5A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {    fontSize: 17,
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
  noticeText: {    fontSize: 16,
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
  shareNoticeText: {    fontSize: 16,
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
  familyMessageTitle: {    fontSize: 21,
    color: "#083A5A",
    marginBottom: 14,
  },
  familyMessageText: {    fontSize: 16,
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
  tabLabel: {    fontSize: 13,
    color: "#6B7C8D",
  },
  tabLabelActive: {
    color: "#0B5D83",
  },
});
