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

const APP_NAME = "앱 이름 자리";
const APP_SUBTITLE =
  "진료실에서 들은 어려운 말을 환자 눈높이에 맞게 쉽게 정리해주는 AI 보조 서비스";

const defaultResult = {
  summary:
    "진료 내용을 입력하거나 음성으로 말하면, AI가 오늘 꼭 기억해야 할 핵심을 한 줄로 정리해드립니다.",
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
  const [screen, setScreen] = useState("home");

  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState(defaultResult);
  const [isLoading, setIsLoading] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceDraft, setVoiceDraft] = useState("");
  const [voiceMode, setVoiceMode] = useState("");

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const shouldKeepListeningRef = useRef(false);
  const voiceModeRef = useRef("");
  const restartTimerRef = useRef(null);

  const [medicinePhotoUri, setMedicinePhotoUri] = useState("");
  const [medicinePhotoName, setMedicinePhotoName] = useState("");
  const [medicinePhotoAnalysis, setMedicinePhotoAnalysis] = useState("");
  const [medicineOcrText, setMedicineOcrText] = useState("");
  const [medicineHintType, setMedicineHintType] = useState("");
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);
  const [photoProgressText, setPhotoProgressText] = useState("");

  const [familyMessage, setFamilyMessage] = useState("");
  const [appNotice, setAppNotice] = useState("");

  const showPopup = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  const normalizeText = (text) => {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setSpeechSupported(false);
      setVoiceMessage("음성 입력은 웹 브라우저에서만 사용할 수 있습니다.");
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
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMessage(
        "듣는 중입니다. 천천히 말씀하시고, 다 말한 뒤 듣기 중지를 눌러주세요."
      );
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";

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
        setVoiceMessage("말씀을 듣고 있습니다. 계속 말씀하셔도 됩니다.");
      }

      if (finalText.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
        setVoiceDraft(finalTranscriptRef.current);
        setLiveTranscript("");
        setVoiceMessage("문장을 인식했습니다. 계속 이어서 말씀하셔도 됩니다.");
      }
    };

    recognition.onerror = (event) => {
      setLiveTranscript("");

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        setVoiceMessage("마이크 권한이 허용되지 않았습니다.");
        showPopup(
          "마이크 권한 필요",
          "음성 입력을 사용하려면 브라우저의 마이크 권한을 허용해주세요.\n\n주소창 왼쪽 자물쇠 아이콘을 눌러 마이크 권한을 허용한 뒤 다시 시도해주세요."
        );
        return;
      }

      if (event.error === "audio-capture") {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        setVoiceMessage("마이크를 찾을 수 없습니다.");
        showPopup(
          "마이크 오류",
          "마이크가 연결되어 있는지, 다른 앱에서 마이크를 사용 중인지 확인해주세요."
        );
        return;
      }

      if (event.error === "no-speech") {
        if (shouldKeepListeningRef.current) {
          setVoiceMessage("잠시 말이 끊겼지만 계속 듣고 있습니다.");
          return;
        }

        setVoiceMessage("음성이 잘 들리지 않았습니다. 다시 시도해주세요.");
        return;
      }

      if (shouldKeepListeningRef.current) {
        setVoiceMessage("음성 인식이 잠시 끊겼습니다. 다시 듣고 있습니다.");
        return;
      }

      setIsListening(false);
      setVoiceMessage("음성 인식 중 오류가 발생했습니다. 다시 시도해주세요.");
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        setVoiceMessage("잠시 끊겨 다시 듣는 중입니다. 계속 말씀해주세요.");

        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }

        restartTimerRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (error) {
            setIsListening(false);
            setVoiceMessage(
              "음성 입력이 일시적으로 중단되었습니다. 다시 음성 입력 버튼을 눌러주세요."
            );
          }
        }, 400);

        return;
      }

      setIsListening(false);
      setLiveTranscript("");

      const finalTranscript = finalTranscriptRef.current.trim();

      if (finalTranscript) {
        setUserInput((prev) => {
          if (voiceModeRef.current === "replace") {
            return finalTranscript;
          }

          if (prev.trim()) {
            return `${prev.trim()} ${finalTranscript}`;
          }

          return finalTranscript;
        });

        setVoiceMessage("음성 입력이 입력창에 반영되었습니다.");
      } else {
        setVoiceMessage("음성 입력이 종료되었습니다. 인식된 문장이 없습니다.");
      }

      setVoiceDraft("");
      finalTranscriptRef.current = "";
      voiceModeRef.current = "";
      setVoiceMode("");
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      try {
        recognition.stop();
      } catch (error) {}
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (
      Platform.OS !== "web" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      showPopup(
        "마이크 권한 필요",
        "음성 입력을 사용하려면 마이크 권한을 허용해야 합니다.\n\n브라우저 주소창 왼쪽 자물쇠 아이콘에서 마이크 권한을 허용해주세요."
      );
      setVoiceMessage("마이크 권한이 허용되지 않았습니다.");
      return false;
    }
  };

  const startVoiceInput = async (mode) => {
    if (!speechSupported || !recognitionRef.current) {
      showPopup(
        "음성 입력 안내",
        "이 브라우저에서는 음성 입력을 사용할 수 없습니다.\n\nChrome 또는 Edge에서 다시 시도해주세요."
      );
      return;
    }

    if (isListening) {
      showPopup(
        "음성 입력 중",
        "이미 듣는 중입니다. 먼저 듣기 중지를 누른 뒤 다시 선택해주세요."
      );
      return;
    }

    const hasPermission = await requestMicrophonePermission();

    if (!hasPermission) {
      return;
    }

    try {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      if (mode === "replace") {
        setUserInput("");
      }

      voiceModeRef.current = mode;
      setVoiceMode(mode);
      finalTranscriptRef.current = "";
      setVoiceDraft("");
      setLiveTranscript("");
      shouldKeepListeningRef.current = true;

      recognitionRef.current.start();
    } catch (error) {
      setVoiceMessage("음성 입력을 다시 시작하려면 잠시 후 눌러주세요.");
    }
  };

  const stopVoiceInput = () => {
    shouldKeepListeningRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

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
      "인슐린",
      "메트포르민",
      "다이아벡스",
      "글루파",
      "글루파850",
      "glupa",
      "glupa850",
      "glupa 850",
      "다이아미크론",
      "디아미크론",
      "diamicron",
      "diamicronmr",
      "diamicron mr",
      "diamicro",
      "diami",
      "gliclazide",
      "gliclazide mr",
      "metformin",
      "insulin",
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
    ];

    if (includesAny(diabetesKeywords)) {
      return "diabetes";
    }

    if (includesAny(bpKeywords)) {
      return "bloodPressure";
    }

    if (includesAny(refluxKeywords)) {
      return "reflux";
    }

    return "unknown";
  };

  const getMedicineAnalysisText = (type) => {
    if (type === "reflux") {
      return {
        title: "위산 억제제 또는 역류성 식도염 관련 약으로 추정됩니다.",
        message:
          "약 봉투에서 위산 억제제, 식전 복용, 역류성 식도염과 관련된 단서가 확인되었습니다. 약 봉투에 식전 복용 안내가 있다면 보통 식사 30분 전 공복 복용이 중요합니다. 단, 정확한 약 이름과 복용법은 처방전과 약 봉투를 함께 확인해야 합니다.",
      };
    }

    if (type === "bloodPressure") {
      return {
        title: "혈압약 관련 약으로 추정됩니다.",
        message:
          "약 봉투에서 혈압약 또는 고혈압 관련 단서가 확인되었습니다. 혈압약은 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요하며, 임의로 중단하면 혈압이 다시 올라갈 수 있습니다.",
      };
    }

    if (type === "diabetes") {
      return {
        title: "당뇨약 또는 혈당 조절 관련 약으로 추정됩니다.",
        message:
          "약 봉투에서 GLUPA, DiAMiCRON 등 당뇨약 또는 혈당 조절 관련 단서가 확인되었습니다. 당뇨약은 약마다 복용 시간이 다를 수 있으므로 약 봉투의 복용법을 꼭 확인해야 합니다. 식은땀, 손떨림, 심한 어지러움 같은 저혈당 증상이 생기면 주의가 필요합니다.",
      };
    }

    return {
      title: "약 봉투 사진이 첨부되었습니다.",
      message:
        "사진을 확인할 수 없습니다. 사진이 흐리거나 글자가 작으면 분석이 어려울 수 있으므로, 약 이름과 복용법이 잘 보이게 촬영하는 것이 좋습니다.",
    };
  };

  const runMedicinePhotoAnalysis = async (imageUri, fileName) => {
    setIsPhotoAnalyzing(true);
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setPhotoProgressText("약 봉투 사진을 분석하는 중입니다...");

    try {
      const Tesseract = await import("tesseract.js");

      const ocrResult = await Tesseract.recognize(imageUri, "kor+eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            const percent = Math.round(m.progress * 100);
            setPhotoProgressText(`약 봉투 사진을 분석하는 중입니다... ${percent}%`);
          }
        },
      });

      const extractedText = ocrResult?.data?.text || "";
      const type = detectMedicineType(`${extractedText} ${fileName}`);
      const analysis = getMedicineAnalysisText(type);

      setMedicineOcrText(extractedText.trim());
      setMedicineHintType(type);
      setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
    } catch (error) {
      const type = detectMedicineType(`${fileName}`);
      const analysis = getMedicineAnalysisText(type);

      setMedicineOcrText("");
      setMedicineHintType(type);
      setMedicinePhotoAnalysis(`사진 분석을 완료했습니다.\n${analysis.message}`);
    } finally {
      setIsPhotoAnalyzing(false);
      setPhotoProgressText("");
    }
  };

  const processMedicinePhotoFile = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    const fileName = file.name || "medicine_bag_photo.jpg";

    setMedicinePhotoName(fileName);
    setAppNotice("");

    reader.onload = () => {
      const imageDataUrl = reader.result;
      setMedicinePhotoUri(imageDataUrl);
      runMedicinePhotoAnalysis(imageDataUrl, fileName);
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
        "카메라 촬영 불가",
        "현재 기기에서는 카메라 촬영을 사용할 수 없습니다.\n\n휴대폰에서 촬영하기를 이용하거나, 사진 선택으로 약 봉투 이미지를 첨부해주세요."
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
    setPhotoProgressText("");
    setAppNotice("");
  };

  const buildResultByType = (type) => {
    if (type === "reflux") {
      return {
        summary:
          "역류성 식도염 또는 위산 관련 약으로 보이며, 위산 억제제는 식전 30분 복용 여부를 약 봉투에서 확인하는 것이 중요합니다.",
        disease:
          "역류성 식도염은 위에 있는 음식물이나 위산이 식도로 거꾸로 올라와서 가슴이 쓰리거나 신물이 올라오는 병이에요. 약을 잘 드시고 생활습관을 조절하면 대부분 증상이 좋아질 수 있어요.",
        medicine:
          "위산을 줄여주는 약, 즉 PPI 계열 약일 가능성이 있습니다. 이 약은 보통 식사 30분 전 공복에 복용할 때 효과가 좋습니다. 다만 정확한 복용 시간은 약 봉투와 처방전을 우선 확인해주세요.",
        caution:
          "매운 음식, 카페인(커피·콜라), 기름진 음식, 술은 피해주세요. 식사 후 2시간 동안은 눕지 마시고, 잠자기 3시간 전에는 음식을 드시지 않는 것이 좋아요.",
        hospital:
          "한 달 뒤에도 증상이 계속되거나 더 심해지면 병원에 다시 방문해야 해요. 피를 토하거나, 검은 변을 보거나, 삼키기 힘든 증상이 생기면 예약일까지 기다리지 말고 빨리 진료를 받는 것이 좋아요.",
      };
    }

    if (type === "bloodPressure") {
      return {
        summary:
          "혈압약 관련 단서가 확인되었으며, 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요합니다.",
        disease:
          "고혈압은 혈관 안의 압력이 계속 높은 상태예요. 당장 증상이 없더라도 오래 지속되면 심장, 뇌혈관, 콩팥에 부담을 줄 수 있어서 꾸준한 관리가 중요해요.",
        medicine:
          "혈압약은 매일 같은 시간에 꾸준히 드시는 것이 중요해요. 증상이 없다고 임의로 끊으면 혈압이 다시 올라갈 수 있습니다. 어지러움이나 심한 부종 같은 증상이 있으면 병원에 문의해주세요.",
        caution:
          "짠 음식은 줄이고, 규칙적인 운동과 체중 관리가 도움이 돼요. 집에서 혈압을 재서 기록하면 진료 때 도움이 됩니다.",
        hospital:
          "심한 두통, 가슴통증, 숨참, 한쪽 팔다리 마비, 말이 어눌해지는 증상이 있으면 바로 진료를 받아야 해요. 혈압이 계속 높게 나오면 예약일 전이라도 병원에 문의해주세요.",
      };
    }

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
          "약을 먹은 뒤 두드러기, 호흡곤란, 심한 어지러움, 입술이나 얼굴이 붓는 증상이 생기면 즉시 진료를 받아야 합니다. 약을 잘못 먹었다고 생각되면 병원이나 약국에 문의해주세요.",
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
        : "약은 처방받은 용법과 용량에 맞춰 복용해야 해요. 식전, 식후, 자기 전 등 복용 시간이 다를 수 있으므로 약 봉투나 처방전을 꼭 확인해주세요. 약을 임의로 끊거나 두 배로 먹는 것은 피해야 해요.",
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
      const typeFromText = detectMedicineType(`${userInput} ${medicineOcrText}`);
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
    shouldKeepListeningRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {}
    }

    setUserInput("");
    setResult(defaultResult);
    setVoiceMessage("");
    setLiveTranscript("");
    setVoiceDraft("");
    setVoiceMode("");
    voiceModeRef.current = "";
    finalTranscriptRef.current = "";
    setIsListening(false);
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setIsPhotoAnalyzing(false);
    setPhotoProgressText("");
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
        setAppNotice("가족에게 공유할 수 있는 창을 열었습니다.");
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
      "약 알림 설정 기능은 추후 구현 예정입니다. 현재는 버튼 UI만 먼저 추가했습니다."
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
          <Text style={styles.topBarSubtitle}>{APP_NAME}</Text>
        </View>

        <View style={styles.logoMini}>
          <Text style={styles.logoMiniText}>로고</Text>
        </View>
      </View>
    );
  };

  const renderHomeScreen = () => {
    return (
      <View style={styles.homeWrap}>
        <View style={styles.homeCard}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>로고 자리</Text>
          </View>

          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.appSubtitle}>{APP_SUBTITLE}</Text>

          <View style={styles.homeFeatureBox}>
            <Text style={styles.homeFeatureTitle}>이 앱으로 할 수 있는 일</Text>
            <Text style={styles.homeFeatureText}>✓ 의사 선생님 말을 음성으로 적기</Text>
            <Text style={styles.homeFeatureText}>✓ 약 봉투 사진을 함께 넣기</Text>
            <Text style={styles.homeFeatureText}>✓ 어려운 진료 내용을 쉽게 보기</Text>
            <Text style={styles.homeFeatureText}>✓ 가족에게 요약문 보내기</Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setScreen("input")}
          >
            <Text style={styles.startButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
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
              placeholder="예: 속 쓰림 때문에 병원에 갔어요. 역류성 식도염이라고 들었고, 약은 식사 전에 먹으라고 하셨어요."
              placeholderTextColor="#7C8797"
            />

            <View style={styles.voicePanel}>
              <View style={styles.voiceHeaderRow}>
                <Text style={styles.voiceTitle}>음성으로 입력하기</Text>
                {voiceMode ? (
                  <Text style={styles.voiceModeBadge}>
                    {voiceMode === "append" ? "이어 말하기" : "새로 말하기"}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.voiceDescription}>
                천천히 말씀하셔도 됩니다. 다 말한 뒤에는 반드시 ‘듣기 중지’를 눌러주세요.
              </Text>

              {!isListening ? (
                <View style={styles.voiceButtonRow}>
                  <TouchableOpacity
                    style={styles.voiceStartButton}
                    onPress={() => startVoiceInput("append")}
                  >
                    <Text style={styles.voiceStartButtonText}>🎤 이어 말하기</Text>
                    <Text style={styles.voiceSubText}>기존 내용 뒤에 추가</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.voiceReplaceButton}
                    onPress={() => startVoiceInput("replace")}
                  >
                    <Text style={styles.voiceReplaceButtonText}>🔄 처음부터 말하기</Text>
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

                  {voiceDraft ? (
                    <View style={styles.transcriptBox}>
                      <Text style={styles.transcriptLabel}>지금까지 적힌 내용</Text>
                      <Text style={styles.transcriptText}>{voiceDraft}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.stopButton} onPress={stopVoiceInput}>
                    <Text style={styles.stopButtonText}>
                      ⏹ 듣기 중지하고 입력하기
                    </Text>
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

                {isPhotoAnalyzing || photoProgressText ? (
                  <Text style={styles.photoAnalysisText}>
                    {photoProgressText || "약 봉투 사진을 분석하는 중입니다..."}
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
              {isLoading ? "정리하는 중입니다..." : "AI로 쉽게 정리하기"}
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
            <Text style={styles.summaryTitle}>오늘 꼭 기억할 내용</Text>
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
            <Text style={styles.familyButtonText}>공유하기 / 복사하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.webAppFrame}>
        {screen === "home" && renderHomeScreen()}
        {screen === "input" && renderInputScreen()}
        {screen === "result" && renderResultScreen()}
        {screen === "share" && renderShareScreen()}
      </View>
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
  page: {
    flex: 1,
    backgroundColor: "#E7EEF7",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  webAppFrame: {
    width: "100%",
    maxWidth: 980,
    height: "92vh",
    minHeight: 720,
    backgroundColor: "#F5F7FA",
    borderRadius: 34,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
  },

  homeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 34,
    backgroundColor: "#EEF6FF",
  },

  homeCard: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: "#FFFFFF",
    borderRadius: 34,
    padding: 36,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },

  logoBox: {
    width: 116,
    height: 116,
    borderRadius: 32,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    borderWidth: 2,
    borderColor: "#93C5FD",
  },

  logoText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1E3A8A",
  },

  appName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
    textAlign: "center",
  },

  appSubtitle: {
    fontSize: 20,
    lineHeight: 32,
    color: "#374151",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "700",
  },

  homeFeatureBox: {
    width: "100%",
    backgroundColor: "#ECFDF5",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    marginBottom: 24,
  },

  homeFeatureTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#065F46",
    marginBottom: 12,
  },

  homeFeatureText: {
    fontSize: 19,
    lineHeight: 34,
    color: "#064E3B",
    fontWeight: "800",
  },

  startButton: {
    width: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: "center",
  },

  startButtonText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  appScreen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  topBar: {
    minHeight: 86,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E5E7EB",
  },

  backIconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  backIconText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111827",
  },

  topBarTitleBox: {
    flex: 1,
  },

  topBarTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },

  topBarSubtitle: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "800",
    marginTop: 3,
  },

  logoMini: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  logoMiniText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1E3A8A",
  },

  screenBody: {
    padding: 26,
    paddingBottom: 44,
  },

  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  stepBadgeText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1E3A8A",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 26,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },

  sectionTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  sectionDescription: {
    fontSize: 19,
    lineHeight: 31,
    color: "#374151",
    marginBottom: 18,
    fontWeight: "700",
  },

  textArea: {
    minHeight: 190,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    padding: 18,
    fontSize: 20,
    lineHeight: 33,
    color: "#111827",
    marginBottom: 18,
  },

  voicePanel: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    padding: 19,
    borderWidth: 1.8,
    borderColor: "#CBD5E1",
  },

  voiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  voiceTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  voiceModeBadge: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E3A8A",
    backgroundColor: "#DBEAFE",
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
  },

  voiceDescription: {
    fontSize: 17,
    lineHeight: 28,
    color: "#4B5563",
    marginBottom: 15,
    fontWeight: "700",
  },

  voiceButtonRow: {
    flexDirection: "row",
    gap: 12,
  },

  voiceStartButton: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#93C5FD",
  },

  voiceStartButtonText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A8A",
    marginBottom: 5,
  },

  voiceReplaceButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#FCA5A5",
  },

  voiceReplaceButtonText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#991B1B",
    marginBottom: 5,
  },

  voiceSubText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "800",
  },

  recordingBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.8,
    borderColor: "#FDBA74",
  },

  recordingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  recordDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    marginRight: 10,
  },

  recordingTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#9A3412",
  },

  recordingGuide: {
    fontSize: 17,
    lineHeight: 28,
    color: "#9A3412",
    marginBottom: 14,
    fontWeight: "800",
  },

  transcriptBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: "#FED7AA",
  },

  transcriptLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9A3412",
    marginBottom: 6,
  },

  transcriptText: {
    fontSize: 18,
    lineHeight: 29,
    color: "#111827",
    fontWeight: "700",
  },

  stopButton: {
    backgroundColor: "#EF4444",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 2,
  },

  stopButtonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },

  voiceMessage: {
    fontSize: 16,
    lineHeight: 26,
    color: "#374151",
    fontWeight: "800",
    marginTop: 12,
  },

  photoButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  photoButton: {
    flex: 1,
    backgroundColor: "#FDF2F8",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#F9A8D4",
  },

  photoButtonText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#9D174D",
  },

  photoPreviewBox: {
    backgroundColor: "#FFF7FB",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.8,
    borderColor: "#F9A8D4",
    marginBottom: 16,
  },

  photoPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  photoPreviewTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#9D174D",
  },

  photoRemoveText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#BE123C",
  },

  medicineImageFrame: {
    width: "100%",
    height: 260,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCE7F3",
  },

  medicineImage: {
    width: "100%",
    height: "100%",
  },

  photoAnalysisText: {
    fontSize: 17,
    lineHeight: 28,
    color: "#831843",
    fontWeight: "800",
  },

  emptyPhotoBox: {
    minHeight: 190,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginBottom: 16,
  },

  emptyPhotoIcon: {
    fontSize: 46,
    marginBottom: 12,
  },

  emptyPhotoText: {
    fontSize: 18,
    lineHeight: 29,
    color: "#4B5563",
    textAlign: "center",
    fontWeight: "800",
  },

  mainButton: {
    backgroundColor: "#15803D",
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  loadingButton: {
    backgroundColor: "#9CA3AF",
  },

  mainButtonText: {
    fontSize: 23,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  clearButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#D1D5DB",
  },

  clearButtonText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#374151",
  },

  summaryBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.8,
    borderColor: "#A7F3D0",
    marginBottom: 20,
  },

  summaryTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#065F46",
    marginBottom: 10,
  },

  summaryText: {
    fontSize: 20,
    lineHeight: 33,
    color: "#064E3B",
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
    borderWidth: 1.8,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  infoCardTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#F3F4F6",
  },

  infoCardText: {
    fontSize: 19,
    lineHeight: 33,
    color: "#1F2937",
    fontWeight: "700",
  },

  actionPanel: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  familyButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#1D4ED8",
  },

  familyButtonLarge: {
    marginTop: 18,
    backgroundColor: "#2563EB",
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#1D4ED8",
  },

  familyButtonText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  alarmButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1.8,
    borderColor: "#D1D5DB",
  },

  alarmButtonText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#374151",
  },

  appNoticeBox: {
    marginBottom: 18,
    backgroundColor: "#EEF2FF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
  },

  appNoticeText: {
    fontSize: 17,
    lineHeight: 27,
    color: "#3730A3",
    fontWeight: "800",
  },

  familyMessageBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.8,
    borderColor: "#BFDBFE",
  },

  familyMessageTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#1E3A8A",
    marginBottom: 14,
  },

  familyMessageText: {
    fontSize: 18,
    lineHeight: 31,
    color: "#1F2937",
    fontWeight: "700",
  },
});