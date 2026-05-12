import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";

export default function App() {
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef(null);

  const [medicinePhotoUri, setMedicinePhotoUri] = useState("");
  const [medicinePhotoName, setMedicinePhotoName] = useState("");
  const [medicinePhotoAnalysis, setMedicinePhotoAnalysis] = useState("");
  const [medicineOcrText, setMedicineOcrText] = useState("");
  const [medicineHintType, setMedicineHintType] = useState("");
  const [ocrProgress, setOcrProgress] = useState("");
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);

  const [familyMessage, setFamilyMessage] = useState("");
  const [showFamilyMessage, setShowFamilyMessage] = useState(false);
  const [appNotice, setAppNotice] = useState("");

  const defaultResult = {
    summary:
      "진료 내용을 입력하면, AI가 오늘 꼭 기억해야 할 핵심을 한 줄로 정리해드립니다.",
    disease:
      "진료 내용을 입력하고 버튼을 누르면, 여기에 환자 눈높이에 맞춘 설명이 나옵니다.",
    medicine:
      "처방받은 약을 언제, 어떻게 먹어야 하는지 쉽게 정리해드립니다.",
    caution:
      "생활에서 조심해야 할 점을 환자 눈높이에 맞게 정리해드립니다.",
    hospital:
      "다시 병원에 가야 하는 상황이나 재진 일정을 정리해드립니다.",
  };

  const [result, setResult] = useState(defaultResult);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setSpeechSupported(false);
      setVoiceMessage("현재 음성인식은 웹 시연 버전에서 지원됩니다.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceMessage(
        "이 브라우저는 음성인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMessage("듣는 중입니다. 진료 내용을 편하게 말씀해주세요.");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;

      setUserInput((prev) => {
        if (prev.trim()) {
          return prev.trim() + " " + transcript;
        }
        return transcript;
      });

      setVoiceMessage("음성 입력이 완료되었습니다.");
    };

    recognition.onerror = () => {
      setVoiceMessage("음성인식 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const normalizeText = (text) => {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  const isMobileBrowser = () => {
    if (Platform.OS !== "web" || typeof navigator === "undefined") {
      return false;
    }

    const userAgent = navigator.userAgent || navigator.vendor || "";
    const mobilePattern =
      /android|iphone|ipad|ipod|windows phone|blackberry|mobile/i;

    return mobilePattern.test(userAgent);
  };

  const detectMedicineType = (ocrText, fileName = "") => {
    const combined = normalizeText(`${ocrText} ${fileName}`);

    const ppiKeywords = [
      "오메프라졸",
      "omeprazole",
      "에스오메프라졸",
      "esomeprazole",
      "란소프라졸",
      "lansoprazole",
      "판토프라졸",
      "pantoprazole",
      "라베프라졸",
      "rabeprazole",
      "ppi",
      "위산",
      "역류",
      "식도염",
      "식전",
      "공복",
    ];

    const bpKeywords = [
      "암로디핀",
      "amlodipine",
      "혈압",
      "고혈압",
      "로사르탄",
      "losartan",
      "발사르탄",
      "valsartan",
      "텔미사르탄",
      "telmisartan",
      "올메사르탄",
      "olmesartan",
      "칸데사르탄",
      "candesartan",
    ];

    const diabetesKeywords = [
      "메트포르민",
      "metformin",
      "당뇨",
      "혈당",
      "인슐린",
      "insulin",
      "글리메피리드",
      "glimepiride",
      "다이아벡스",
    ];

    const hasAny = (keywords) => keywords.some((word) => combined.includes(word));

    if (hasAny(ppiKeywords)) {
      return {
        type: "reflux",
        title: "위산 억제제 또는 역류성 식도염 관련 약으로 추정됩니다.",
        message:
          "사진 속 글자에서 위산 억제제, 식전 복용, 역류성 식도염과 관련된 단서가 확인되었습니다. 약 봉투에 식전 복용 안내가 있다면 보통 식사 30분 전 공복 복용이 중요합니다. 단, 정확한 약 이름과 복용법은 처방전과 약 봉투를 함께 확인해야 합니다.",
      };
    }

    if (hasAny(bpKeywords)) {
      return {
        type: "bloodPressure",
        title: "혈압약 관련 약으로 추정됩니다.",
        message:
          "사진 속 글자에서 혈압약 또는 고혈압 관련 단서가 확인되었습니다. 혈압약은 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요하며, 임의로 중단하면 혈압이 다시 올라갈 수 있습니다.",
      };
    }

    if (hasAny(diabetesKeywords)) {
      return {
        type: "diabetes",
        title: "당뇨약 또는 혈당 조절 관련 약으로 추정됩니다.",
        message:
          "사진 속 글자에서 당뇨약 또는 혈당 조절 관련 단서가 확인되었습니다. 약 종류에 따라 식전·식후 복용법이 달라질 수 있으므로 약 봉투의 복용 시간을 꼭 확인해야 합니다. 식은땀, 손떨림, 심한 어지러움 같은 저혈당 증상도 주의해야 합니다.",
      };
    }

    if (combined.length > 0) {
      return {
        type: "unknown",
        title: "약 봉투의 일부 글자가 인식되었습니다.",
        message:
          "사진에서 일부 글자를 읽었지만, 현재 프로토타입의 예시 약물군과 명확히 매칭되지는 않았습니다. 실제 서비스에서는 OCR 결과를 약물 데이터베이스와 연결해 약 이름, 용량, 복용 시간을 더 정확히 확인하도록 확장할 수 있습니다.",
      };
    }

    return {
      type: "unknown",
      title: "약 봉투 글자 인식이 명확하지 않습니다.",
      message:
        "사진이 흐리거나 글자가 작으면 OCR 인식이 어려울 수 있습니다. 약 봉투를 밝은 곳에서 정면으로 촬영하고, 약 이름과 복용법이 잘 보이게 다시 첨부하면 더 좋습니다.",
    };
  };

  const handleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      setVoiceMessage("현재 환경에서는 음성인식을 사용할 수 없습니다.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      setVoiceMessage("음성인식을 다시 시작하려면 잠시 후 눌러주세요.");
    }
  };

  const runMedicineOcr = async (imageUri, fileName) => {
    setIsPhotoAnalyzing(true);
    setOcrProgress("OCR 준비 중입니다...");
    setMedicineOcrText("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("");

    try {
      const Tesseract = await import("tesseract.js");

      const ocrResult = await Tesseract.recognize(imageUri, "kor+eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            const percent = Math.round(m.progress * 100);
            setOcrProgress(`약 봉투 글자를 읽는 중입니다... ${percent}%`);
          } else if (m.status) {
            setOcrProgress(`OCR 진행 중: ${m.status}`);
          }
        },
      });

      const extractedText = ocrResult?.data?.text || "";
      const detected = detectMedicineType(extractedText, fileName);

      setMedicineOcrText(extractedText.trim());
      setMedicineHintType(detected.type);
      setMedicinePhotoAnalysis(`${detected.title}\n${detected.message}`);
      setOcrProgress("OCR 분석이 완료되었습니다.");
    } catch (error) {
      const detected = detectMedicineType("", fileName);

      setMedicineOcrText("");
      setMedicineHintType(detected.type);
      setMedicinePhotoAnalysis(
        `OCR 분석 중 오류가 발생했습니다. 현재는 파일명과 입력 내용을 바탕으로 예시 분석을 제공합니다.\n${detected.message}`
      );
      setOcrProgress("OCR 분석에 실패했습니다.");
    } finally {
      setIsPhotoAnalyzing(false);
    }
  };

  const processMedicinePhotoFile = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    setMedicinePhotoName(file.name || "촬영한 약 봉투 사진");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setOcrProgress("");
    setAppNotice("");

    reader.onload = () => {
      const imageDataUrl = reader.result;
      setMedicinePhotoUri(imageDataUrl);
      runMedicineOcr(imageDataUrl, file.name || "captured_medicine_bag.jpg");
    };

    reader.readAsDataURL(file);
  };

  const openMedicinePhotoInput = (mode) => {
    setShowFamilyMessage(false);
    setAppNotice("");

    if (Platform.OS !== "web") {
      setAppNotice(
        "약 봉투 사진 OCR 기능은 현재 웹 시연 버전에서 우선 지원됩니다."
      );
      return;
    }

    if (mode === "camera" && !isMobileBrowser()) {
      setAppNotice(
        "현재 기기에서는 카메라 촬영을 사용할 수 없습니다. 휴대폰에서 촬영하기를 이용하거나, 사진 선택으로 약 봉투 이미지를 첨부해주세요."
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

  const handleSelectMedicinePhoto = () => {
    openMedicinePhotoInput("gallery");
  };

  const handleCaptureMedicinePhoto = () => {
    openMedicinePhotoInput("camera");
  };

  const handleRemoveMedicinePhoto = () => {
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setOcrProgress("");
    setIsPhotoAnalyzing(false);
    setAppNotice("첨부된 약 봉투 사진을 삭제했습니다.");
  };

  const handleClear = () => {
    setUserInput("");
    setVoiceMessage("");
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineOcrText("");
    setMedicineHintType("");
    setOcrProgress("");
    setIsPhotoAnalyzing(false);
    setFamilyMessage("");
    setShowFamilyMessage(false);
    setAppNotice("");
    setResult(defaultResult);
  };

  const handleTranslate = () => {
    if (!userInput.trim() && !medicinePhotoUri) {
      setResult({
        summary: "진료 내용 또는 약 봉투 사진을 먼저 입력해주세요.",
        disease:
          "직접 입력하거나, 음성 입력 버튼을 눌러 진료 중 들은 내용을 말씀해주시면 됩니다.",
        medicine:
          "약 봉투 사진을 함께 첨부하면 OCR로 약 이름과 복용법 단서를 읽어 복약 설명에 반영할 수 있습니다.",
        caution:
          "음식, 운동, 생활습관에 대해 들은 주의사항도 함께 입력해주세요.",
        hospital:
          "재진 일정이나 다시 병원에 오라는 말을 들었다면 함께 적어주세요.",
      });
      setAppNotice("");
      setShowFamilyMessage(false);
      return;
    }

    setIsLoading(true);
    setAppNotice("");
    setShowFamilyMessage(false);

    setTimeout(() => {
      const text = userInput.toLowerCase();
      const detectedText = normalizeText(`${text} ${medicineOcrText}`);
      const hasRefluxHint =
        detectedText.includes("역류") ||
        detectedText.includes("속 쓰림") ||
        detectedText.includes("속쓰림") ||
        detectedText.includes("식도염") ||
        detectedText.includes("위산") ||
        medicineHintType === "reflux";

      const hasBpHint =
        detectedText.includes("혈압") ||
        detectedText.includes("고혈압") ||
        detectedText.includes("암로디핀") ||
        medicineHintType === "bloodPressure";

      const hasDiabetesHint =
        detectedText.includes("당뇨") ||
        detectedText.includes("혈당") ||
        detectedText.includes("인슐린") ||
        medicineHintType === "diabetes";

      if (hasRefluxHint) {
        setResult({
          summary:
            "역류성 식도염 또는 위산 관련 약으로 보이며, 위산 억제제는 식전 30분 복용 여부를 약 봉투에서 확인하는 것이 중요합니다.",
          disease:
            "역류성 식도염은 위에 있는 음식물이나 위산이 식도로 거꾸로 올라와서 가슴이 쓰리거나 신물이 올라오는 병이에요. 진료 내용이나 약 봉투에서 위산 억제제 관련 단서가 확인되었습니다.",
          medicine:
            "약 봉투 사진에서 위산 억제제 또는 식전 복용과 관련된 단서가 확인되었습니다. PPI 계열 약은 보통 식사 30분 전 공복에 복용할 때 효과가 좋습니다. 다만 정확한 복용 시간은 약 봉투와 처방전을 우선 확인해주세요.",
          caution:
            "매운 음식, 카페인(커피·콜라), 기름진 음식, 술은 피해주세요. 식사 후 2시간 동안은 눕지 마시고, 잠자기 3시간 전에는 음식을 드시지 않는 것이 좋아요.",
          hospital:
            "한 달 뒤에도 증상이 계속되거나 더 심해지면 병원에 다시 방문해야 해요. 피를 토하거나, 검은 변을 보거나, 삼키기 힘든 증상이 생기면 예약일까지 기다리지 말고 빨리 진료를 받는 것이 좋아요.",
        });
      } else if (hasBpHint) {
        setResult({
          summary:
            "혈압약 관련 단서가 확인되었으며, 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요합니다.",
          disease:
            "고혈압은 혈관 안의 압력이 계속 높은 상태예요. 당장 증상이 없더라도 오래 지속되면 심장, 뇌혈관, 콩팥에 부담을 줄 수 있어서 꾸준한 관리가 중요해요.",
          medicine:
            "약 봉투 사진에서 혈압약 관련 단서가 확인되었습니다. 혈압약은 매일 같은 시간에 꾸준히 드시는 것이 중요해요. 증상이 없다고 임의로 끊으면 혈압이 다시 올라갈 수 있습니다.",
          caution:
            "짠 음식은 줄이고, 규칙적인 운동과 체중 관리가 도움이 돼요. 집에서 혈압을 재서 기록하면 진료 때 도움이 됩니다.",
          hospital:
            "심한 두통, 가슴통증, 숨참, 한쪽 팔다리 마비, 말이 어눌해지는 증상이 있으면 바로 진료를 받아야 해요. 혈압이 계속 높게 나오면 예약일 전이라도 병원에 문의해주세요.",
        });
      } else if (hasDiabetesHint) {
        setResult({
          summary:
            "당뇨약 또는 혈당 조절 관련 단서가 확인되었으며, 약 복용 시간과 식사 시간을 함께 지키는 것이 중요합니다.",
          disease:
            "당뇨병은 혈액 속 포도당, 즉 혈당이 높게 유지되는 병이에요. 혈당이 오래 높으면 눈, 콩팥, 신경, 혈관에 문제가 생길 수 있어서 꾸준한 관리가 필요해요.",
          medicine:
            "약 봉투 사진에서 당뇨약 또는 혈당 조절 관련 단서가 확인되었습니다. 당뇨약은 약 종류에 따라 식전·식후 복용법이 다를 수 있으므로 약 봉투의 복용 시간을 꼭 확인해주세요.",
          caution:
            "식사를 거르지 않고 규칙적으로 드시는 것이 중요해요. 단 음료나 과도한 간식은 줄이고, 혈당을 기록하면 치료 조절에 도움이 됩니다.",
          hospital:
            "식은땀, 손떨림, 심한 어지러움, 의식이 흐려지는 증상은 저혈당일 수 있어요. 이런 증상이 반복되거나 혈당이 너무 높게 유지되면 병원에 문의해야 해요.",
        });
      } else if (medicinePhotoUri && !userInput.trim()) {
        setResult({
          summary:
            "약 봉투 사진이 첨부되었습니다. OCR 결과를 바탕으로 약 이름과 복용법을 확인하려고 시도했습니다.",
          disease:
            "현재는 진료 내용이 입력되지 않아 정확한 병명은 알 수 없습니다. 병명이나 증상을 함께 입력하면 더 구체적인 설명을 받을 수 있습니다.",
          medicine:
            medicinePhotoAnalysis ||
            "약 봉투 사진이 첨부되었습니다. 사진 속 약 이름, 용량, 복용 시간을 확인해 복약 설명에 반영할 수 있습니다.",
          caution:
            "사진만으로 약을 임의로 판단하거나 복용법을 바꾸면 안 됩니다. 약 이름이 헷갈리거나 복용 시간을 잊은 경우에는 약국이나 병원에 확인하는 것이 안전합니다.",
          hospital:
            "약을 먹은 뒤 두드러기, 호흡곤란, 심한 어지러움, 입술이나 얼굴이 붓는 증상이 생기면 즉시 진료를 받아야 합니다. 약을 잘못 먹었다고 생각되면 병원이나 약국에 문의해주세요.",
        });
      } else {
        setResult({
          summary:
            "입력하신 진료 내용과 약 봉투 사진을 바탕으로, 정확한 진단명·복약법·주의사항은 처방전과 의료진 설명을 함께 확인하는 것이 중요합니다.",
          disease:
            "입력하신 진료 내용을 바탕으로 보면, 현재 증상과 의사 선생님의 설명을 쉽게 정리해 이해하는 것이 중요해요. 정확한 진단명은 의료진의 설명과 처방전을 함께 확인해야 해요.",
          medicine:
            medicinePhotoUri
              ? `약 봉투 사진이 함께 첨부되었습니다. ${medicinePhotoAnalysis || "약 봉투의 약 이름과 복용 시간을 확인한 뒤 처방받은 용법과 용량에 맞춰 복용해야 합니다."}`
              : "약은 처방받은 용법과 용량에 맞춰 복용해야 해요. 식전, 식후, 자기 전 등 복용 시간이 다를 수 있으므로 약 봉투나 처방전을 꼭 확인해주세요. 약을 임의로 끊거나 두 배로 먹는 것은 피해야 해요.",
          caution:
            "생활습관 관리나 음식 조절에 대한 설명을 들었다면 잘 지키는 것이 좋아요. 증상이 갑자기 심해지거나 평소와 다른 증상이 생기면 병원에 문의해주세요.",
          hospital:
            "호흡곤란, 심한 통증, 고열, 의식 저하, 심한 알레르기 반응이 생기면 바로 병원에 문의해야 해요. 재진 일정이 안내되었다면 꼭 지키는 것이 좋아요.",
        });
      }

      setIsLoading(false);
    }, 1200);
  };

  const handleNotifyFamily = async () => {
    const photoLine =
      medicinePhotoAnalysis || medicineOcrText
        ? `\n첨부 약 봉투 참고:\n${medicinePhotoAnalysis || ""}\n${
            medicineOcrText ? `\nOCR로 읽은 글자:\n${medicineOcrText}` : ""
          }\n`
        : "";

    const message = `[진료 내용 요약]

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

    setFamilyMessage(message);
    setShowFamilyMessage(true);

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
    setShowFamilyMessage(false);
    setFamilyMessage("");
    setAppNotice(
      "약 알림 설정 기능은 추후 구현 예정입니다. 현재는 버튼 UI만 먼저 추가했습니다."
    );
  };

  const handleCloseFamilyMessage = () => {
    setShowFamilyMessage(false);
    setFamilyMessage("");
    setAppNotice("");
  };

  const appContent = (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>진료 내용 쉬운 말 번역기 🩺</Text>
          <Text style={styles.subtitle}>
            진료실에서 들은 내용을 말하거나 입력하면{"\n"}
            환자 눈높이에 맞게 카드로 정리해드립니다.
          </Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>환자 입력</Text>

          <TextInput
            style={styles.textArea}
            multiline
            textAlignVertical="top"
            value={userInput}
            onChangeText={setUserInput}
            placeholder="의사 선생님께 들은 내용을 편하게 적어주세요."
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.subButtonRow}>
            <TouchableOpacity
              style={[
                styles.voiceButtonHalf,
                isListening && styles.voiceButtonActive,
              ]}
              onPress={handleVoiceInput}
            >
              <Text style={styles.voiceButtonText}>
                {isListening ? "🔴 듣는 중" : "🎤 음성 입력"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButtonHalf} onPress={handleClear}>
              <Text style={styles.clearButtonText}>입력 지우기</Text>
            </TouchableOpacity>
          </View>

          {voiceMessage ? (
            <Text style={styles.voiceMessage}>{voiceMessage}</Text>
          ) : null}

          <Text style={styles.photoGuideText}>약 봉투가 있다면 함께 첨부해주세요.</Text>

          <View style={styles.photoActionRow}>
            <TouchableOpacity
              style={styles.photoSelectButton}
              onPress={handleSelectMedicinePhoto}
            >
              <Text style={styles.photoButtonText}>🖼️ 사진 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoCaptureButton}
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

              <Image
                source={{ uri: medicinePhotoUri }}
                style={styles.medicineImage}
                resizeMode="cover"
              />

              {medicinePhotoName ? (
                <Text style={styles.photoFileName}>{medicinePhotoName}</Text>
              ) : null}

              {isPhotoAnalyzing || ocrProgress ? (
                <Text style={styles.photoAnalysisText}>
                  {ocrProgress || "AI가 약 봉투 사진을 분석하는 중입니다... ⏳"}
                </Text>
              ) : null}

              {medicinePhotoAnalysis ? (
                <Text style={styles.photoAnalysisText}>
                  {medicinePhotoAnalysis}
                </Text>
              ) : null}

              {medicineOcrText ? (
                <View style={styles.ocrTextBox}>
                  <Text style={styles.ocrTextTitle}>OCR로 읽은 글자</Text>
                  <Text style={styles.ocrText}>
                    {medicineOcrText.length > 450
                      ? `${medicineOcrText.slice(0, 450)}...`
                      : medicineOcrText}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.mainButton, isLoading && styles.loadingButton]}
            onPress={handleTranslate}
            disabled={isLoading}
          >
            <Text style={styles.mainButtonText}>
              {isLoading
                ? "AI가 쉽게 정리하는 중... ⏳"
                : "AI로 쉽게 정리하기 ✨"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>오늘의 핵심 한 줄</Text>
          <Text style={styles.summaryText}>{result.summary}</Text>
        </View>

        <View style={styles.resultSection}>
          <InfoCard
            icon="📋"
            title="카드 1. 무슨 병인가요?"
            text={result.disease}
          />
          <InfoCard
            icon="💊"
            title="카드 2. 약은 어떻게 먹어야 하나요?"
            text={result.medicine}
          />
          <InfoCard
            icon="⚠️"
            title="카드 3. 무엇을 조심해야 하나요?"
            text={result.caution}
          />
          <InfoCard
            icon="🏥"
            title="카드 4. 언제 다시 병원에 가야 하나요?"
            text={result.hospital}
          />
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.familyButton} onPress={handleNotifyFamily}>
            <Text style={styles.familyButtonText}>👨‍👩‍👧 가족에게 알리기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.alarmButton} onPress={handleMedicineAlarm}>
            <Text style={styles.alarmButtonText}>⏰ 약 알림 설정</Text>
          </TouchableOpacity>
        </View>

        {appNotice ? (
          <View style={styles.appNoticeBox}>
            <Text style={styles.appNoticeText}>{appNotice}</Text>
          </View>
        ) : null}

        {showFamilyMessage ? (
          <View style={styles.familyMessageBox}>
            <Text style={styles.familyMessageTitle}>보호자용 요약문</Text>
            <Text style={styles.familyMessageText}>{familyMessage}</Text>

            <TouchableOpacity
              style={styles.closeFamilyButton}
              onPress={handleCloseFamilyMessage}
            >
              <Text style={styles.closeFamilyButtonText}>요약문 닫기</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>안전 안내</Text>
          <Text style={styles.noticeText}>
            본 앱은 진단이나 처방을 대신하지 않고, 의료진에게 들은 내용을
            이해하기 쉽게 정리하는 발표용 보조 앱입니다.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.webBackground}>
        <View style={styles.phoneShadow}>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneStatusBar}>
              <Text style={styles.statusTime}>{currentTime}</Text>

              <View style={styles.statusRight}>
                <View style={styles.signalBars}>
                  <View style={[styles.signalBar, styles.signalBar1]} />
                  <View style={[styles.signalBar, styles.signalBar2]} />
                  <View style={[styles.signalBar, styles.signalBar3]} />
                  <View style={[styles.signalBar, styles.signalBar4]} />
                </View>

                <Text style={styles.networkText}>5G</Text>

                <View style={styles.batteryGroup}>
                  <View style={styles.battery}>
                    <View style={styles.batteryFill} />
                  </View>
                  <View style={styles.batteryCap} />
                </View>
              </View>
            </View>

            <View style={styles.phoneNotch} />

            <View style={styles.phoneScreen}>
              {appContent}
              <View style={styles.homeIndicatorWrap}>
                <View style={styles.homeIndicator} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{appContent}</SafeAreaView>;
}

function InfoCard({ icon, title, text }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {icon} {title}
      </Text>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  webBackground: {
    flex: 1,
    backgroundColor: "#DDE7F0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    paddingHorizontal: 20,
  },

  phoneShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
  },

  phoneFrame: {
    width: 390,
    height: 820,
    backgroundColor: "#0B1120",
    borderRadius: 48,
    padding: 11,
    borderWidth: 3,
    borderColor: "#1F2937",
    position: "relative",
  },

  phoneStatusBar: {
    height: 36,
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 24,
    paddingTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusTime: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 0.2,
  },

  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 12,
    marginRight: 1,
  },

  signalBar: {
    width: 3,
    backgroundColor: "#111827",
    borderRadius: 2,
  },

  signalBar1: {
    height: 4,
  },

  signalBar2: {
    height: 6,
  },

  signalBar3: {
    height: 8,
  },

  signalBar4: {
    height: 10,
  },

  networkText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#111827",
    marginLeft: 1,
  },

  batteryGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2,
  },

  battery: {
    width: 22,
    height: 11,
    borderWidth: 1.5,
    borderColor: "#111827",
    borderRadius: 3,
    padding: 1.4,
  },

  batteryFill: {
    height: "100%",
    width: "78%",
    backgroundColor: "#111827",
    borderRadius: 1.5,
  },

  batteryCap: {
    width: 2.6,
    height: 5.2,
    backgroundColor: "#111827",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginLeft: 1.5,
  },

  phoneNotch: {
    position: "absolute",
    top: 16,
    left: "50%",
    marginLeft: -52,
    width: 104,
    height: 25,
    backgroundColor: "#0B1120",
    borderBottomLeftRadius: 19,
    borderBottomRightRadius: 19,
    zIndex: 10,
  },

  phoneScreen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: "hidden",
    position: "relative",
  },

  homeIndicatorWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 7,
    alignItems: "center",
    pointerEvents: "none",
  },

  homeIndicator: {
    width: 118,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#111827",
    opacity: 0.85,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    width: "100%",
    alignSelf: "center",
    padding: 18,
    paddingBottom: 56,
  },

  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 21,
    marginBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  title: {
    fontSize: Platform.OS === "web" ? 22 : 27,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    fontSize: Platform.OS === "web" ? 15 : 18,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: Platform.OS === "web" ? 23 : 27,
  },

  inputBox: {
    marginBottom: 22,
  },

  label: {
    fontSize: Platform.OS === "web" ? 18 : 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  textArea: {
    minHeight: 155,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    padding: 16,
    fontSize: Platform.OS === "web" ? 16 : 19,
    lineHeight: Platform.OS === "web" ? 26 : 30,
    color: "#111827",
    marginBottom: 12,
  },

  subButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  voiceButtonHalf: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },

  clearButtonHalf: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  voiceButtonActive: {
    backgroundColor: "#FCA5A5",
    borderColor: "#F87171",
  },

  voiceButtonText: {
    color: "#1E3A8A",
    fontSize: Platform.OS === "web" ? 15 : 17,
    fontWeight: "900",
  },

  clearButtonText: {
    color: "#991B1B",
    fontSize: Platform.OS === "web" ? 15 : 17,
    fontWeight: "900",
  },

  voiceMessage: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: -6,
    marginBottom: 14,
    lineHeight: 20,
  },

  photoGuideText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "700",
  },

  photoActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  photoSelectButton: {
    flex: 1,
    backgroundColor: "#FDF2F8",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F9A8D4",
  },

  photoCaptureButton: {
    flex: 1,
    backgroundColor: "#FCE7F3",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F472B6",
  },

  photoButtonText: {
    color: "#9D174D",
    fontSize: Platform.OS === "web" ? 15 : 17,
    fontWeight: "900",
  },

  photoPreviewBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#F9A8D4",
    marginBottom: 14,
  },

  photoPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  photoPreviewTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9D174D",
  },

  photoRemoveText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#BE123C",
  },

  medicineImage: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },

  photoFileName: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },

  photoAnalysisText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#831843",
    fontWeight: "700",
    marginBottom: 8,
  },

  ocrTextBox: {
    backgroundColor: "#FDF2F8",
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },

  ocrTextTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#9D174D",
    marginBottom: 6,
  },

  ocrText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#4B5563",
  },

  mainButton: {
    backgroundColor: "#A7F3D0",
    paddingVertical: 19,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  loadingButton: {
    backgroundColor: "#D1D5DB",
  },

  mainButtonText: {
    color: "#064E3B",
    fontSize: Platform.OS === "web" ? 19 : 22,
    fontWeight: "900",
  },

  summaryBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },

  summaryTitle: {
    fontSize: Platform.OS === "web" ? 17 : 19,
    fontWeight: "900",
    color: "#065F46",
    marginBottom: 8,
  },

  summaryText: {
    fontSize: Platform.OS === "web" ? 16 : 18,
    lineHeight: Platform.OS === "web" ? 26 : 29,
    color: "#064E3B",
  },

  resultSection: {
    gap: 18,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  cardTitle: {
    fontSize: Platform.OS === "web" ? 18 : 21,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#F3F4F6",
  },

  cardText: {
    fontSize: Platform.OS === "web" ? 16 : 18,
    lineHeight: Platform.OS === "web" ? 27 : 31,
    color: "#374151",
  },

  actionSection: {
    marginTop: 20,
    gap: 12,
  },

  familyButton: {
    backgroundColor: "#DBEAFE",
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
  },

  familyButtonText: {
    color: "#1E3A8A",
    fontSize: Platform.OS === "web" ? 17 : 19,
    fontWeight: "900",
  },

  alarmButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
  },

  alarmButtonText: {
    color: "#374151",
    fontSize: Platform.OS === "web" ? 17 : 19,
    fontWeight: "900",
  },

  appNoticeBox: {
    marginTop: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },

  appNoticeText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#3730A3",
    fontWeight: "700",
  },

  familyMessageBox: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },

  familyMessageTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
    marginBottom: 10,
  },

  familyMessageText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
  },

  closeFamilyButton: {
    marginTop: 14,
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  closeFamilyButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "800",
  },

  noticeBox: {
    marginTop: 24,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 16,
  },

  noticeTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#92400E",
    marginBottom: 6,
  },

  noticeText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#92400E",
  },
});