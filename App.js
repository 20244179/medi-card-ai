import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFonts } from "expo-font";

const APP_NAME = "마이닥터";
const APP_SUBTITLE =
  "진료 내용을 환자 눈높이에 맞게 쉽게 정리해주는 AI 보조 앱";

const LOGO = require("./assets/mydoctor-logo.png");

const FONT = {
  koRegular: "NanumRound",
  koBold: "NanumRoundBold",
  koExtraBold: "NanumRoundExtraBold",
  enRegular: "MontserratRegular",
  enSemiBold: "MontserratSemiBold",
  enBold: "MontserratBold",
  enExtraBold: "MontserratExtraBold",
};

const defaultResult = {
  summary:
    "진료 내용을 입력하거나 음성으로 말하면, 오늘 꼭 기억해야 할 핵심을 쉽게 정리해드립니다.",
  disease:
    "진료 내용을 입력하고 버튼을 누르면, 여기에 환자 눈높이에 맞춘 설명이 나옵니다.",
  medicine:
    "처방받은 약을 언제, 어떻게 먹어야 하는지 쉽게 정리해드립니다.",
  caution:
    "생활에서 조심해야 할 점을 환자 눈높이에 맞게 정리해드립니다.",
  hospital:
    "다시 병원에 가야 하는 상황이나 재진 일정을 정리해드립니다.",
};

export default function App() {
  const [fontsLoaded] = useFonts({
    NanumRound: require("./assets/fonts/NanumSquareRoundR.ttf"),
    NanumRoundBold: require("./assets/fonts/NanumSquareRoundB.ttf"),
    NanumRoundExtraBold: require("./assets/fonts/NanumSquareRoundEB.ttf"),

    MontserratRegular: require("./assets/fonts/Montserrat-Regular.ttf"),
    MontserratSemiBold: require("./assets/fonts/Montserrat-SemiBold.ttf"),
    MontserratBold: require("./assets/fonts/Montserrat-Bold.ttf"),
    MontserratExtraBold: require("./assets/fonts/Montserrat-ExtraBold.ttf"),
  });

  const [screen, setScreen] = useState("home");

  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState(defaultResult);
  const [isLoading, setIsLoading] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceMode, setVoiceMode] = useState("");
  const recognitionRef = useRef(null);
  const speechBufferRef = useRef("");

  const [medicinePhotoUri, setMedicinePhotoUri] = useState("");
  const [medicinePhotoName, setMedicinePhotoName] = useState("");
  const [medicinePhotoAnalysis, setMedicinePhotoAnalysis] = useState("");
  const [medicineOcrText, setMedicineOcrText] = useState("");
  const [medicineHintType, setMedicineHintType] = useState("");
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);

  const [familyMessage, setFamilyMessage] = useState("");
  const [appNotice, setAppNotice] = useState("");

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const style = document.createElement("style");
      style.innerHTML = `
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background: #F4F8FB;
          overflow: hidden;
        }

        * {
          box-sizing: border-box;
        }

        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: #BCD7E5;
          border-radius: 999px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setSpeechSupported(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceMessage(
        "이 브라우저는 음성 입력을 지원하지 않습니다. Chrome 또는 Edge에서 사용해주세요."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript("");
      speechBufferRef.current = "";
      setVoiceMessage("듣는 중입니다. 천천히 말씀해주세요.");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";

        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText.trim()) {
        setLiveTranscript(interimText.trim());
        setVoiceMessage("말씀을 듣고 있습니다. 다 말한 뒤 듣기 중지를 눌러주세요.");
      }

      if (finalText.trim()) {
        speechBufferRef.current = `${speechBufferRef.current} ${finalText}`.trim();
        setLiveTranscript(speechBufferRef.current);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setLiveTranscript("");

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceMessage("마이크 권한이 허용되지 않았습니다.");
        showPopup(
          "마이크 권한 필요",
          "음성 입력을 사용하려면 브라우저의 마이크 권한을 허용해주세요."
        );
        return;
      }

      if (event.error === "no-speech") {
        setVoiceMessage(
          "음성이 잘 들리지 않았습니다. 조용한 곳에서 다시 말씀해주세요."
        );
        return;
      }

      setVoiceMessage("음성 인식 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.");
    };

    recognition.onend = () => {
      const transcript = speechBufferRef.current.trim();

      if (transcript) {
        setUserInput((prev) => {
          if (voiceMode === "replace") {
            return transcript;
          }

          if (prev.trim()) {
            return `${prev.trim()} ${transcript}`;
          }

          return transcript;
        });

        setVoiceMessage("음성 입력이 입력창에 반영되었습니다.");
      } else {
        setVoiceMessage("인식된 문장이 없습니다. 다시 말씀해주세요.");
      }

      setIsListening(false);
      setLiveTranscript("");
      setVoiceMode("");
      speechBufferRef.current = "";
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);
  }, [voiceMode]);

  if (!fontsLoaded) {
    return <View style={styles.loadingRoot} />;
  }

  const showPopup = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  const resetAllAndGoHome = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {}
    }

    setScreen("home");
    setUserInput("");
    setResult(defaultResult);
    setIsLoading(false);

    setIsListening(false);
    setVoiceMessage("");
    setLiveTranscript("");
    setVoiceMode("");
    speechBufferRef.current = "";

    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setIsPhotoAnalyzing(false);

    setFamilyMessage("");
    setAppNotice("");
  };

  const normalizeText = (text) => {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  const detectMedicineType = (text = "") => {
    const combined = normalizeText(text);

    const compactCombined = combined
      .replace(/[\s\-_().,[\]{}<>]/g, "")
      .replace(/mg/g, "")
      .replace(/정/g, "")
      .replace(/정제/g, "")
      .replace(/서방/g, "")
      .replace(/필름코팅/g, "");

    const includesAny = (keywords) => {
      return keywords.some((word) => {
        const normalizedWord = normalizeText(word);
        const compactWord = normalizedWord
          .replace(/[\s\-_().,[\]{}<>]/g, "")
          .replace(/mg/g, "")
          .replace(/정/g, "")
          .replace(/정제/g, "")
          .replace(/서방/g, "")
          .replace(/필름코팅/g, "");

        return (
          combined.includes(normalizedWord) ||
          compactCombined.includes(compactWord)
        );
      });
    };

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
      "글루파 850",
      "glupa",
      "glupa850",
      "glupa 850",
      "다이아미크론",
      "디아미크론",
      "다이아미크론엠알",
      "디아미크론엠알",
      "diamicron",
      "diamicronmr",
      "diamicron mr",
      "dia micron",
      "dia mi cron",
      "gliclazide",
      "gliclazide mr",
      "metformin",
      "insulin",
      "glucose",
      "diabetes",
    ];

    const bpKeywords = [
      "고혈압",
      "혈압",
      "암로디핀",
      "노바스크",
      "로사르탄",
      "코자",
      "발사르탄",
      "텔미사르탄",
      "amlodipine",
      "norvasc",
      "losartan",
      "cozaar",
      "valsartan",
      "telmisartan",
      "blood pressure",
      "hypertension",
    ];

    const refluxKeywords = [
      "역류",
      "속쓰림",
      "속 쓰림",
      "식도염",
      "위산",
      "위산분비억제",
      "위산 분비 억제",
      "ppi",
      "오메프라졸",
      "에스오메프라졸",
      "판토프라졸",
      "란소프라졸",
      "라베프라졸",
      "알비스",
      "모티리톤",
      "omeprazole",
      "esomeprazole",
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
        title: "당뇨약 또는 혈당 조절 관련 단서가 확인되었습니다.",
        message:
          "당뇨약은 약마다 복용 시간이 다를 수 있으므로 약 봉투의 복용법을 꼭 확인해야 합니다. 식은땀, 손떨림, 심한 어지러움 같은 저혈당 증상이 생기면 주의가 필요합니다.",
      };
    }

    if (type === "bloodPressure") {
      return {
        title: "혈압약 관련 단서가 확인되었습니다.",
        message:
          "혈압약은 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요합니다. 임의로 중단하면 혈압이 다시 올라갈 수 있습니다.",
      };
    }

    if (type === "reflux") {
      return {
        title: "위산 억제제 또는 역류성 식도염 관련 단서가 확인되었습니다.",
        message:
          "위산을 줄여주는 약은 보통 식사 30분 전 공복 복용이 중요한 경우가 많습니다. 정확한 복용법은 약 봉투와 처방전을 함께 확인해야 합니다.",
      };
    }

    return {
      title: "약 봉투 글자를 정확히 확인하기 어렵습니다.",
      message:
        "약 이름과 복용 시간이 잘 보이도록 다시 촬영하거나, 진료 내용을 직접 입력해주세요.",
    };
  };

  const extractTextWithTesseract = async (imageUri) => {
    try {
      const TesseractModule = await import("tesseract.js");
      const Tesseract = TesseractModule.default || TesseractModule;
      const recognize = Tesseract.recognize;

      if (!recognize) {
        return "";
      }

      const result = await recognize(imageUri, "kor+eng");
      return result?.data?.text || "";
    } catch (error) {
      return "";
    }
  };

  const startVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      showPopup(
        "음성 입력 안내",
        "이 브라우저에서는 음성 입력을 사용할 수 없습니다. Chrome 또는 Edge에서 다시 시도해주세요."
      );
      return;
    }

    try {
      setVoiceMessage("");
      setLiveTranscript("");
      speechBufferRef.current = "";
      recognitionRef.current.start();
    } catch (error) {
      setVoiceMessage("음성 입력을 다시 시작하려면 잠시 후 눌러주세요.");
    }
  };

  const startVoiceWithMode = (mode) => {
    if (mode === "replace") {
      setUserInput("");
    }

    setVoiceMode(mode);
    setTimeout(() => startVoiceInput(), 0);
  };

  const stopVoiceInput = () => {
    try {
      recognitionRef.current?.stop();
    } catch (error) {
      setIsListening(false);
      setVoiceMessage("음성 입력을 종료했습니다.");
    }
  };

  const isMobileBrowser = () => {
    if (Platform.OS !== "web" || typeof navigator === "undefined") {
      return false;
    }

    const userAgent = navigator.userAgent || navigator.vendor || "";
    return /android|iphone|ipad|ipod|windows phone|mobile/i.test(userAgent);
  };

  const analyzeMedicinePhoto = async (imageUri, photoName = "") => {
    setIsPhotoAnalyzing(true);
    setMedicinePhotoAnalysis("");
    setMedicineHintType("");
    setMedicineOcrText("");
    setAppNotice("");

    try {
      const extractedText = await extractTextWithTesseract(imageUri);

      setMedicineOcrText(extractedText);

      const type = detectMedicineType(
        `${extractedText} ${photoName} ${userInput}`
      );
      const analysis = getMedicineAnalysisText(type);

      setMedicineHintType(type);
      setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
    } catch (error) {
      const type = detectMedicineType(`${photoName} ${userInput}`);
      const analysis = getMedicineAnalysisText(type);

      setMedicineHintType(type);
      setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
    } finally {
      setIsPhotoAnalyzing(false);
    }
  };

  const processMedicinePhotoFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name || "medicine_bag_photo.jpg";

    setMedicinePhotoName(fileName);
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setAppNotice("");

    reader.onload = () => {
      const imageDataUrl = reader.result;
      setMedicinePhotoUri(imageDataUrl);
      analyzeMedicinePhoto(imageDataUrl, fileName);
    };

    reader.readAsDataURL(file);
  };

  const openPhotoInput = (mode) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      showPopup("사진 기능 안내", "웹 브라우저에서 이용해주세요.");
      return;
    }

    if (mode === "camera" && !isMobileBrowser()) {
      showPopup(
        "카메라 촬영 안내",
        "현재 기기에서는 바로 촬영을 사용할 수 없습니다.\n\n휴대폰에서는 촬영하기를 이용할 수 있고, 컴퓨터에서는 사진 선택으로 약 봉투 이미지를 첨부해주세요."
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
    setMedicineHintType("");
    setIsPhotoAnalyzing(false);
    setAppNotice("");
  };

  const buildResultByType = (type) => {
    if (type === "diabetes") {
      return {
        summary:
          "당뇨약 또는 혈당 조절 관련 단서가 확인되었으며, 약 복용 시간과 식사 시간을 함께 지키는 것이 중요합니다.",
        disease:
          "당뇨병은 혈액 속 포도당, 즉 혈당이 높게 유지되는 병이에요. 혈당이 오래 높으면 눈, 콩팥, 신경, 혈관에 문제가 생길 수 있어서 꾸준한 관리가 필요해요.",
        medicine:
          "당뇨약은 약 종류에 따라 식전·식후 복용법이 다를 수 있으므로 약 봉투의 복용 시간을 꼭 확인해주세요. 식사를 거른 상태에서 약을 먹으면 저혈당이 생길 수 있어 주의가 필요합니다.",
        caution:
          "식사를 거르지 않고 규칙적으로 드시는 것이 중요해요. 단 음료나 과도한 간식은 줄이고, 혈당을 기록하면 치료 조절에 도움이 됩니다.",
        hospital:
          "식은땀, 손떨림, 심한 어지러움, 의식이 흐려지는 증상은 저혈당일 수 있어요. 이런 증상이 반복되거나 혈당이 너무 높게 유지되면 병원에 문의해야 해요.",
      };
    }

    if (type === "bloodPressure") {
      return {
        summary:
          "혈압약 관련 단서가 확인되었으며, 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요합니다.",
        disease:
          "고혈압은 혈관 안의 압력이 계속 높은 상태예요. 당장 증상이 없더라도 오래 지속되면 심장, 뇌혈관, 콩팥에 부담을 줄 수 있어서 꾸준한 관리가 중요해요.",
        medicine:
          "혈압약은 매일 같은 시간에 꾸준히 드시는 것이 중요해요. 증상이 없다고 임의로 끊으면 혈압이 다시 올라갈 수 있습니다.",
        caution:
          "짠 음식은 줄이고, 규칙적인 운동과 체중 관리가 도움이 돼요. 집에서 혈압을 재서 기록하면 진료 때 도움이 됩니다.",
        hospital:
          "심한 두통, 가슴통증, 숨참, 한쪽 팔다리 마비, 말이 어눌해지는 증상이 있으면 바로 진료를 받아야 해요.",
      };
    }

    if (type === "reflux") {
      return {
        summary:
          "역류성 식도염 또는 위산 관련 단서가 확인되며, 위산 억제제는 식전 30분 복용 여부를 약 봉투에서 확인하는 것이 중요합니다.",
        disease:
          "역류성 식도염은 위에 있는 음식물이나 위산이 식도로 거꾸로 올라와서 가슴이 쓰리거나 신물이 올라오는 병이에요. 약을 잘 드시고 생활습관을 조절하면 대부분 증상이 좋아질 수 있어요.",
        medicine:
          "위산을 줄여주는 약은 보통 식사 30분 전 공복에 복용할 때 효과가 좋습니다. 다만 정확한 복용 시간은 약 봉투와 처방전을 우선 확인해주세요.",
        caution:
          "매운 음식, 카페인, 기름진 음식, 술은 피해주세요. 식사 후 2시간 동안은 눕지 마시고, 잠자기 3시간 전에는 음식을 드시지 않는 것이 좋아요.",
        hospital:
          "한 달 뒤에도 증상이 계속되거나 더 심해지면 병원에 다시 방문해야 해요. 피를 토하거나, 검은 변을 보거나, 삼키기 힘든 증상이 생기면 빨리 진료를 받는 것이 좋아요.",
      };
    }

    if (medicinePhotoUri && !userInput.trim()) {
      return {
        summary:
          "약 봉투 사진이 첨부되었습니다. 약 이름과 복용법은 약 봉투와 처방전을 함께 확인하는 것이 중요합니다.",
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
        "입력하신 진료 내용을 바탕으로, 정확한 진단명·복약법·주의사항은 처방전과 의료진 설명을 함께 확인하는 것이 중요합니다.",
      disease:
        "입력하신 진료 내용을 바탕으로 보면, 현재 증상과 의사 선생님의 설명을 쉽게 정리해 이해하는 것이 중요해요. 정확한 진단명은 의료진의 설명과 처방전을 함께 확인해야 해요.",
      medicine: medicinePhotoUri
        ? `약 봉투 사진이 함께 첨부되었습니다. ${
            medicinePhotoAnalysis ||
            "약 봉투의 약 이름과 복용 시간을 확인한 뒤 처방받은 용법과 용량에 맞춰 복용해야 합니다."
          }`
        : "약은 처방받은 용법과 용량에 맞춰 복용해야 해요. 식전, 식후, 자기 전 등 복용 시간이 다를 수 있으므로 약 봉투나 처방전을 꼭 확인해주세요.",
      caution:
        "생활습관 관리나 음식 조절에 대한 설명을 들었다면 잘 지키는 것이 좋아요. 증상이 갑자기 심해지거나 평소와 다른 증상이 생기면 병원에 문의해주세요.",
      hospital:
        "호흡곤란, 심한 통증, 고열, 의식 저하, 심한 알레르기 반응이 생기면 바로 병원에 문의해야 해요. 재진 일정이 안내되었다면 꼭 지키는 것이 좋아요.",
    };
  };

  const handleTranslate = () => {
    if (!userInput.trim() && !medicinePhotoUri) {
      setResult({
        summary: "진료 내용 또는 약 봉투 사진을 먼저 입력해주세요.",
        disease:
          "직접 입력하거나, 음성 입력 버튼을 눌러 진료 중 들은 내용을 말씀해주시면 됩니다.",
        medicine:
          "약 봉투 사진을 함께 첨부하면 약 이름과 복용법 단서를 확인해 복약 설명에 반영할 수 있습니다.",
        caution:
          "음식, 운동, 생활습관에 대해 들은 주의사항도 함께 입력해주세요.",
        hospital:
          "재진 일정이나 다시 병원에 오라는 말을 들었다면 함께 적어주세요.",
      });
      setScreen("result");
      return;
    }

    setIsLoading(true);
    setAppNotice("");

    setTimeout(() => {
      const typeFromText = detectMedicineType(
        `${userInput} ${medicineOcrText} ${medicinePhotoName}`
      );
      const finalType =
        medicineHintType && medicineHintType !== "unknown"
          ? medicineHintType
          : typeFromText;

      setResult(buildResultByType(finalType));
      setIsLoading(false);
      setScreen("result");
    }, 900);
  };

  const handleClear = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {}
    }

    setUserInput("");
    setResult(defaultResult);
    setIsLoading(false);
    setIsListening(false);
    setVoiceMessage("");
    setLiveTranscript("");
    setVoiceMode("");
    speechBufferRef.current = "";
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setIsPhotoAnalyzing(false);
    setFamilyMessage("");
    setAppNotice("");
    setScreen("input");
  };

  const buildFamilyMessage = () => {
    const photoLine = medicinePhotoAnalysis
      ? `\n첨부 약 봉투 참고:\n${medicinePhotoAnalysis}\n`
      : "";

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
${photoLine}
※ 이 내용은 진료 내용을 쉽게 정리한 보조 설명이며, 정확한 내용은 처방전과 의료진 설명을 함께 확인해주세요.`;
  };

  const handleNotifyFamily = async () => {
    const message = buildFamilyMessage();

    setFamilyMessage(message);
    setScreen("share");
    setAppNotice("");

    try {
      if (Platform.OS === "web" && navigator.share) {
        await navigator.share({
          title: "진료 내용 요약",
          text: message,
        });
        return;
      }

      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setAppNotice("보호자에게 보낼 요약문이 클립보드에 복사되었습니다.");
        return;
      }

      setAppNotice("아래 보호자용 요약문을 복사해 가족에게 전달해주세요.");
    } catch (error) {
      setAppNotice("아래 보호자용 요약문을 복사해 가족에게 전달해주세요.");
    }
  };

  const handleMedicineAlarm = () => {
    showPopup(
      "약 알림 설정",
      "약 알림 기능은 다음 단계에서 설정할 수 있습니다. 현재는 복약 시간 설정 화면으로 연결될 예정입니다."
    );
  };

  const renderTopBar = (title, backTarget) => {
    return (
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => setScreen(backTarget || "home")}
        >
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>

        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>{title}</Text>
          <Text style={styles.topBarSubtitle}>MyDoctor</Text>
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

  const renderHomeScreen = () => {
    return (
      <View style={styles.homeWrap}>
        <View style={styles.homeHero}>
          <Image source={LOGO} style={styles.homeLogoImage} resizeMode="contain" />

          <Text style={styles.homeMainText}>
            진료실에서 들은 어려운 말을{"\n"}쉽게 정리해드려요
          </Text>
        </View>

        <View style={styles.homeFeatureBox}>
          <View style={styles.homeFeatureHeader}>
            <Text style={styles.homeFeatureIcon}>✧</Text>
            <Text style={styles.homeFeatureTitle}>이 앱으로 할 수 있는 일</Text>
          </View>

          <Text style={styles.homeFeatureText}>✓ 어려운 진료 내용을 쉽게 보기</Text>
          <Text style={styles.homeFeatureText}>✓ 가족에게 요약문 보내기</Text>
          <Text style={styles.homeFeatureText}>✓ 약 알림 시간 설정하기</Text>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setScreen("input")}
        >
          <Text style={styles.startButtonText}>시작하기</Text>
        </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>진료실에서 들은 내용을 적어주세요</Text>
            <Text style={styles.sectionDescription}>
              직접 입력해도 되고, 아래 음성 입력 버튼을 눌러 말해도 됩니다.
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

            <View style={styles.voicePanel}>
              <View style={styles.voiceHeaderRow}>
                <Text style={styles.voiceTitle}>음성으로 입력하기</Text>
                {voiceMode ? (
                  <Text style={styles.voiceModeBadge}>
                    {voiceMode === "append" ? "이어 말하기" : "처음부터 말하기"}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.voiceDescription}>
                천천히 말씀하셔도 됩니다. 다 말한 뒤에는 ‘듣기 중지’를 눌러주세요.
              </Text>

              {!isListening ? (
                <View style={styles.voiceButtonRow}>
                  <TouchableOpacity
                    style={styles.voiceStartButton}
                    onPress={() => startVoiceWithMode("append")}
                  >
                    <Text style={styles.voiceStartButtonText}>🎤 이어 말하기</Text>
                    <Text style={styles.voiceSubText}>기존 내용 뒤에 추가</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.voiceReplaceButton}
                    onPress={() => startVoiceWithMode("replace")}
                  >
                    <Text style={styles.voiceReplaceButtonText}>↻ 처음부터 말하기</Text>
                    <Text style={styles.voiceSubText}>입력창을 비우고 시작</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.recordingBox}>
                  <View style={styles.recordingTopRow}>
                    <View style={styles.recordDot} />
                    <Text style={styles.recordingTitle}>듣는 중입니다</Text>
                  </View>

                  <Text style={styles.recordingGuide}>
                    천천히 말씀하세요. 다 말씀하셨으면 아래 버튼을 눌러주세요.
                  </Text>

                  {liveTranscript ? (
                    <View style={styles.transcriptBox}>
                      <Text style={styles.transcriptLabel}>지금 듣고 있는 말</Text>
                      <Text style={styles.transcriptText}>{liveTranscript}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.stopButton} onPress={stopVoiceInput}>
                    <Text style={styles.stopButtonText}>⏹ 듣기 중지하고 입력하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {voiceMessage ? (
                <Text style={styles.voiceMessage}>{voiceMessage}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2단계</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>약 봉투 사진이 있으면 넣어주세요</Text>
            <Text style={styles.sectionDescription}>
              약 이름이 기억나지 않을 때 도움이 됩니다. 없으면 건너뛰어도 됩니다.
            </Text>

            <View style={styles.photoButtonRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openPhotoInput("gallery")}
              >
                <Text style={styles.photoButtonText}>🖼️ 사진 선택</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => openPhotoInput("camera")}
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

                {isPhotoAnalyzing ? (
                  <Text style={styles.photoAnalysisText}>
                    약 봉투 글자를 확인하고 있습니다.{"\n"}잠시만 기다려주세요.
                  </Text>
                ) : null}

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
                  약 봉투 사진을 넣으면 복약 설명에 함께 반영됩니다.
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
              {isLoading
                ? "진료 내용을 쉬운 설명 카드로 정리하고 있습니다."
                : "AI로 쉽게 정리하기"}
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

            <TouchableOpacity style={styles.alarmButton} onPress={handleMedicineAlarm}>
              <Text style={styles.alarmButtonText}>약 알림 설정</Text>
            </TouchableOpacity>
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

          {appNotice ? (
            <View style={styles.appNoticeBox}>
              <Text style={styles.appNoticeText}>{appNotice}</Text>
            </View>
          ) : null}

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

  return (
    <View style={styles.page}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.appRoot}>
          {screen === "home" && renderHomeScreen()}
          {screen === "input" && renderInputScreen()}
          {screen === "result" && renderResultScreen()}
          {screen === "share" && renderShareScreen()}
        </View>
      </KeyboardAvoidingView>
    </View>
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

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: "#F4F8FB",
  },

  page: {
    flex: 1,
    backgroundColor: "#F4F8FB",
    alignItems: "center",
    justifyContent: "center",
  },

  keyboardView: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },

  appRoot: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#F4F8FB",
  },

  homeWrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 24,
    backgroundColor: "#F4F8FB",
    justifyContent: "center",
  },

  homeHero: {
    alignItems: "center",
    marginBottom: 24,
  },

  homeLogoImage: {
    width: 180,
    height: 180,
    marginBottom: 4,
  },

  homeMainText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 21,
    lineHeight: 34,
    color: "#083A5A",
    textAlign: "center",
    letterSpacing: -0.4,
  },

  homeFeatureBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#D8E7F0",
    marginBottom: 22,
    shadowColor: "#0B3A59",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  homeFeatureHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  homeFeatureIcon: {
    fontFamily: FONT.enExtraBold,
    fontSize: 22,
    color: "#0B78A6",
    marginRight: 8,
  },

  homeFeatureTitle: {
    fontFamily: FONT.koExtraBold,
    fontSize: 20,
    color: "#083A5A",
  },

  homeFeatureText: {
    fontFamily: FONT.koBold,
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
    shadowColor: "#0B3A59",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },

  startButtonText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 23,
    color: "#FFFFFF",
  },

  appScreen: {
    flex: 1,
    backgroundColor: "#F4F8FB",
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
    fontFamily: FONT.enExtraBold,
    fontSize: 30,
    color: "#083A5A",
  },

  topBarTitleBox: {
    flex: 1,
  },

  topBarTitle: {
    fontFamily: FONT.koExtraBold,
    fontSize: 23,
    color: "#083A5A",
  },

  topBarSubtitle: {
    fontFamily: FONT.enBold,
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

  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DFF1FA",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  stepBadgeText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 16,
    color: "#0B5D83",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.4,
    borderColor: "#D8E7F0",
    shadowColor: "#0B3A59",
    shadowOpacity: 0.055,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },

  sectionTitle: {
    fontFamily: FONT.koExtraBold,
    fontSize: 23,
    color: "#083A5A",
    marginBottom: 10,
  },

  sectionDescription: {
    fontFamily: FONT.koBold,
    fontSize: 17,
    lineHeight: 29,
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
    fontFamily: FONT.koRegular,
    fontSize: 18,
    lineHeight: 31,
    color: "#0B2535",
    marginBottom: 18,
    outlineStyle: "none",
  },

  voicePanel: {
    backgroundColor: "#F8FBFD",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
  },

  voiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  voiceTitle: {
    fontFamily: FONT.koExtraBold,
    fontSize: 20,
    color: "#083A5A",
  },

  voiceModeBadge: {
    fontFamily: FONT.koExtraBold,
    fontSize: 14,
    color: "#0B5D83",
    backgroundColor: "#DFF1FA",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  voiceDescription: {
    fontFamily: FONT.koBold,
    fontSize: 16,
    lineHeight: 27,
    color: "#4A7087",
    marginBottom: 14,
  },

  voiceButtonRow: {
    flexDirection: "row",
    gap: 10,
  },

  voiceStartButton: {
    flex: 1,
    backgroundColor: "#DFF1FA",
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#8FC7DE",
  },

  voiceStartButtonText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 16,
    color: "#0B5D83",
    marginBottom: 5,
    textAlign: "center",
  },

  voiceReplaceButton: {
    flex: 1,
    backgroundColor: "#EEF6FA",
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#BCD7E5",
  },

  voiceReplaceButtonText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 16,
    color: "#164B6A",
    marginBottom: 5,
    textAlign: "center",
  },

  voiceSubText: {
    fontFamily: FONT.koBold,
    fontSize: 13,
    color: "#315B73",
    textAlign: "center",
  },

  recordingBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.8,
    borderColor: "#FDBA74",
  },

  recordingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  recordDot: {
    width: 13,
    height: 13,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    marginRight: 10,
  },

  recordingTitle: {
    fontFamily: FONT.koExtraBold,
    fontSize: 20,
    color: "#9A3412",
  },

  recordingGuide: {
    fontFamily: FONT.koBold,
    fontSize: 16,
    lineHeight: 27,
    color: "#9A3412",
    marginBottom: 14,
  },

  transcriptBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: "#FED7AA",
  },

  transcriptLabel: {
    fontFamily: FONT.koExtraBold,
    fontSize: 14,
    color: "#9A3412",
    marginBottom: 6,
  },

  transcriptText: {
    fontFamily: FONT.koBold,
    fontSize: 17,
    lineHeight: 28,
    color: "#111827",
  },

  stopButton: {
    backgroundColor: "#C2410C",
    borderRadius: 20,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 2,
  },

  stopButtonText: {
    fontFamily: FONT.koExtraBold,
    color: "#FFFFFF",
    fontSize: 18,
  },

  voiceMessage: {
    fontFamily: FONT.koBold,
    fontSize: 15,
    lineHeight: 25,
    color: "#315B73",
    marginTop: 12,
  },

  photoButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  photoButton: {
    flex: 1,
    backgroundColor: "#EFF7FB",
    borderRadius: 20,
    paddingVertical: 17,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#8FC7DE",
  },

  photoButtonText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 18,
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
    fontFamily: FONT.koExtraBold,
    fontSize: 17,
    color: "#083A5A",
  },

  photoRemoveText: {
    fontFamily: FONT.koExtraBold,
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
    fontFamily: FONT.koBold,
    fontSize: 16,
    lineHeight: 27,
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
    fontFamily: FONT.enBold,
    fontSize: 42,
    marginBottom: 10,
  },

  emptyPhotoText: {
    fontFamily: FONT.koBold,
    fontSize: 17,
    lineHeight: 28,
    color: "#315B73",
    textAlign: "center",
  },

  mainButton: {
    backgroundColor: "#0B78A6",
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#0B3A59",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  loadingButton: {
    backgroundColor: "#8AA8B8",
  },

  mainButtonText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 21,
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
    fontFamily: FONT.koExtraBold,
    fontSize: 17,
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
    fontFamily: FONT.koExtraBold,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 10,
  },

  summaryText: {
    fontFamily: FONT.koBold,
    fontSize: 18,
    lineHeight: 31,
    color: "#083A5A",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1.8,
    borderColor: "#D8E7F0",
    shadowColor: "#0B3A59",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  infoCardTitle: {
    fontFamily: FONT.koExtraBold,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 13,
    paddingBottom: 11,
    borderBottomWidth: 2,
    borderBottomColor: "#EFF7FB",
  },

  infoCardText: {
    fontFamily: FONT.koBold,
    fontSize: 17,
    lineHeight: 30,
    color: "#17384A",
  },

  actionPanel: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  familyButton: {
    flex: 1,
    backgroundColor: "#0B78A6",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#086083",
  },

  familyButtonLarge: {
    marginTop: 18,
    backgroundColor: "#0B78A6",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#086083",
  },

  familyButtonText: {
    fontFamily: FONT.koExtraBold,
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
  },

  alarmButtonText: {
    fontFamily: FONT.koExtraBold,
    fontSize: 17,
    color: "#315B73",
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
    fontFamily: FONT.koBold,
    fontSize: 16,
    lineHeight: 26,
    color: "#083A5A",
  },

  appNoticeBox: {
    marginBottom: 18,
    backgroundColor: "#EAF7EF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#B7E2C5",
  },

  appNoticeText: {
    fontFamily: FONT.koBold,
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
    fontFamily: FONT.koExtraBold,
    fontSize: 21,
    color: "#083A5A",
    marginBottom: 14,
  },

  familyMessageText: {
    fontFamily: FONT.koBold,
    fontSize: 16,
    lineHeight: 29,
    color: "#17384A",
  },
});