import React, { useRef, useState } from "react";
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
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

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
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState(defaultResult);
  const [isLoading, setIsLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const speechBufferRef = useRef("");

  const [medicinePhotoUri, setMedicinePhotoUri] = useState("");
  const [medicinePhotoName, setMedicinePhotoName] = useState("");
  const [medicinePhotoAnalysis, setMedicinePhotoAnalysis] = useState("");
  const [medicineHintType, setMedicineHintType] = useState("");
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);

  const [familyMessage, setFamilyMessage] = useState("");
  const [showFamilyMessage, setShowFamilyMessage] = useState(false);
  const [appNotice, setAppNotice] = useState("");

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setVoiceMessage("듣는 중입니다. 진료 내용을 편하게 말씀해주세요.");
    speechBufferRef.current = "";
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript || "";

    if (transcript.trim()) {
      speechBufferRef.current = transcript.trim();
      setVoiceMessage(`인식 중: ${transcript.trim()}`);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    const transcript = speechBufferRef.current.trim();

    if (transcript) {
      setUserInput((prev) => {
        if (prev.trim()) {
          return `${prev.trim()} ${transcript}`;
        }
        return transcript;
      });
      setVoiceMessage("음성 입력이 완료되었습니다.");
    } else {
      setVoiceMessage("음성 입력이 종료되었습니다.");
    }

    speechBufferRef.current = "";
    setIsListening(false);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);

    if (event.error === "no-speech" || event.error === "speech-timeout") {
      setVoiceMessage("음성이 잘 들리지 않았습니다. 다시 시도해주세요.");
      return;
    }

    if (event.error === "not-allowed") {
      setVoiceMessage("마이크 권한이 허용되지 않았습니다.");
      Alert.alert(
        "마이크 권한 필요",
        "음성 입력을 사용하려면 마이크 권한을 허용해주세요."
      );
      return;
    }

    setVoiceMessage("음성 인식 중 오류가 발생했습니다. 다시 시도해주세요.");
  });

  const normalizeText = (text) => {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  const detectMedicineType = (text = "") => {
    const combined = normalizeText(text);

    const refluxKeywords = [
      "역류",
      "속쓰림",
      "속 쓰림",
      "식도염",
      "위산",
      "ppi",
      "오메프라졸",
      "에스오메프라졸",
      "판토프라졸",
      "란소프라졸",
      "라베프라졸",
      "omeprazole",
      "esomeprazole",
      "pantoprazole",
      "식전",
      "공복",
    ];

    const bpKeywords = [
      "고혈압",
      "혈압",
      "암로디핀",
      "로사르탄",
      "발사르탄",
      "텔미사르탄",
      "amlodipine",
      "losartan",
      "valsartan",
    ];

    const diabetesKeywords = [
      "당뇨",
      "혈당",
      "인슐린",
      "메트포르민",
      "다이아벡스",
      "metformin",
      "insulin",
    ];

    const hasAny = (keywords) => keywords.some((word) => combined.includes(word));

    if (hasAny(refluxKeywords)) {
      return "reflux";
    }

    if (hasAny(bpKeywords)) {
      return "bloodPressure";
    }

    if (hasAny(diabetesKeywords)) {
      return "diabetes";
    }

    return "unknown";
  };

  const getMedicineAnalysisText = (type) => {
    if (type === "reflux") {
      return {
        title: "위산 억제제 또는 역류성 식도염 관련 약으로 추정됩니다.",
        message:
          "약 봉투에서 위산 억제제, 식전 복용, 역류성 식도염과 관련된 단서가 확인된 것으로 처리했습니다. 위산 억제제는 보통 식사 30분 전 공복 복용이 중요한 경우가 많습니다. 정확한 약 이름과 복용법은 약 봉투와 처방전을 함께 확인해야 합니다.",
      };
    }

    if (type === "bloodPressure") {
      return {
        title: "혈압약 관련 약으로 추정됩니다.",
        message:
          "약 봉투에서 혈압약 또는 고혈압 관련 단서가 확인된 것으로 처리했습니다. 혈압약은 증상이 없어도 매일 같은 시간에 꾸준히 복용하는 것이 중요합니다. 임의로 중단하면 혈압이 다시 올라갈 수 있습니다.",
      };
    }

    if (type === "diabetes") {
      return {
        title: "당뇨약 또는 혈당 조절 관련 약으로 추정됩니다.",
        message:
          "약 봉투에서 당뇨약 또는 혈당 조절 관련 단서가 확인된 것으로 처리했습니다. 당뇨약은 약 종류에 따라 식전·식후 복용법이 달라질 수 있으므로 약 봉투의 복용 시간을 꼭 확인해야 합니다.",
      };
    }

    return {
      title: "약 봉투 사진이 첨부되었습니다.",
      message:
        "약 봉투 사진을 확인 대상으로 등록했습니다. 현재 발표용 버전에서는 사진 첨부와 복약 설명 반영 흐름을 구현했으며, 실제 서비스에서는 OCR과 약물 데이터베이스를 연동해 약 이름, 용량, 복용 시간을 더 정확히 확인하도록 확장할 수 있습니다.",
    };
  };

  const handleVoiceInput = async () => {
    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }

      const permissionResult =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "마이크 권한 필요",
          "음성 입력을 사용하려면 마이크 권한을 허용해주세요."
        );
        return;
      }

      speechBufferRef.current = "";

      ExpoSpeechRecognitionModule.start({
        lang: "ko-KR",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: false,
      });
    } catch (error) {
      setIsListening(false);
      setVoiceMessage("음성 인식을 시작할 수 없습니다. 다시 시도해주세요.");
      Alert.alert(
        "음성 인식 오류",
        "음성 인식을 시작할 수 없습니다. S23에서 마이크 권한과 인터넷 연결을 확인해주세요."
      );
    }
  };

  const analyzeMedicinePhoto = (photoName = "") => {
    setIsPhotoAnalyzing(true);
    setMedicinePhotoAnalysis("");
    setAppNotice("");

    setTimeout(() => {
      const type = detectMedicineType(`${photoName} ${userInput}`);
      const analysis = getMedicineAnalysisText(type);

      setMedicineHintType(type);
      setMedicinePhotoAnalysis(`${analysis.title}\n${analysis.message}`);
      setIsPhotoAnalyzing(false);
    }, 1100);
  };

  const processPickedImage = (asset, sourceLabel) => {
    if (!asset?.uri) {
      return;
    }

    const name =
      asset.fileName ||
      asset.uri?.split("/")?.pop() ||
      `${sourceLabel}_medicine_bag.jpg`;

    setMedicinePhotoUri(asset.uri);
    setMedicinePhotoName(name);
    setMedicineHintType("");
    setMedicinePhotoAnalysis("");
    setShowFamilyMessage(false);

    analyzeMedicinePhoto(name);
  };

  const handleSelectMedicinePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
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

      if (pickerResult.canceled) {
        return;
      }

      processPickedImage(pickerResult.assets?.[0], "selected");
    } catch (error) {
      Alert.alert(
        "사진 선택 오류",
        "사진을 선택하는 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  };

  const handleCaptureMedicinePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
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

      if (cameraResult.canceled) {
        return;
      }

      processPickedImage(cameraResult.assets?.[0], "captured");
    } catch (error) {
      Alert.alert(
        "촬영 오류",
        "카메라를 여는 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  };

  const handleRemoveMedicinePhoto = () => {
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("");
    setIsPhotoAnalyzing(false);
    setAppNotice("");
  };

  const handleClear = () => {
    setUserInput("");
    setResult(defaultResult);
    setVoiceMessage("");
    setMedicinePhotoUri("");
    setMedicinePhotoName("");
    setMedicinePhotoAnalysis("");
    setMedicineHintType("");
    setIsPhotoAnalyzing(false);
    setFamilyMessage("");
    setShowFamilyMessage(false);
    setAppNotice("");
    speechBufferRef.current = "";
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
      return;
    }

    setIsLoading(true);
    setShowFamilyMessage(false);
    setAppNotice("");

    setTimeout(() => {
      const typeFromText = detectMedicineType(userInput);
      const finalType =
        medicineHintType && medicineHintType !== "unknown"
          ? medicineHintType
          : typeFromText;

      setResult(buildResultByType(finalType));
      setIsLoading(false);
    }, 900);
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
    setShowFamilyMessage(true);
    setAppNotice("");

    try {
      await Share.share(
        {
          title: "진료 내용 요약",
          message,
        },
        {
          dialogTitle: "가족에게 진료 내용 공유하기",
        }
      );
    } catch (error) {
      Alert.alert(
        "공유 오류",
        "공유창을 여는 중 문제가 발생했습니다. 아래 보호자용 요약문을 복사해서 전달해주세요."
      );
    }
  };

  const handleMedicineAlarm = () => {
    setShowFamilyMessage(false);
    setFamilyMessage("");
    Alert.alert(
      "약 알림 설정",
      "약 알림 설정 기능은 추후 구현 예정입니다. 현재는 버튼 UI만 먼저 추가했습니다."
    );
  };

  const handleCloseFamilyMessage = () => {
    setShowFamilyMessage(false);
    setFamilyMessage("");
    setAppNotice("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

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
                  {isListening ? "🔴 듣는 중지" : "🎤 음성 입력"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearButtonHalf} onPress={handleClear}>
                <Text style={styles.clearButtonText}>입력 지우기</Text>
              </TouchableOpacity>
            </View>

            {voiceMessage ? (
              <Text style={styles.voiceMessage}>{voiceMessage}</Text>
            ) : null}

            <Text style={styles.photoGuideText}>
              약 봉투가 있다면 함께 첨부해주세요.
            </Text>

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
                  <Text style={styles.photoPreviewTitle}>
                    첨부된 약 봉투 사진
                  </Text>
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

                {isPhotoAnalyzing ? (
                  <Text style={styles.photoAnalysisText}>
                    약 봉투 사진을 분석하는 중입니다... ⏳
                  </Text>
                ) : null}

                {medicinePhotoAnalysis ? (
                  <Text style={styles.photoAnalysisText}>
                    {medicinePhotoAnalysis}
                  </Text>
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
            <TouchableOpacity
              style={styles.familyButton}
              onPress={handleNotifyFamily}
            >
              <Text style={styles.familyButtonText}>👨‍👩‍👧 가족에게 알리기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.alarmButton}
              onPress={handleMedicineAlarm}
            >
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
    </SafeAreaView>
  );
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

  keyboardView: {
    flex: 1,
  },

  container: {
    width: "100%",
    padding: 20,
    paddingBottom: 48,
  },

  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    marginBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 17,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 26,
  },

  inputBox: {
    marginBottom: 22,
  },

  label: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  textArea: {
    minHeight: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    padding: 16,
    fontSize: 18,
    lineHeight: 29,
    color: "#111827",
    marginBottom: 12,
  },

  subButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  voiceButtonHalf: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },

  voiceButtonActive: {
    backgroundColor: "#FCA5A5",
    borderColor: "#F87171",
  },

  voiceButtonText: {
    color: "#1E3A8A",
    fontSize: 16,
    fontWeight: "900",
  },

  clearButtonHalf: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  clearButtonText: {
    color: "#991B1B",
    fontSize: 16,
    fontWeight: "900",
  },

  voiceMessage: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
    lineHeight: 21,
    fontWeight: "700",
  },

  photoGuideText: {
    fontSize: 14,
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
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F9A8D4",
  },

  photoCaptureButton: {
    flex: 1,
    backgroundColor: "#FCE7F3",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F472B6",
  },

  photoButtonText: {
    color: "#9D174D",
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "900",
    color: "#9D174D",
  },

  photoRemoveText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#BE123C",
  },

  medicineImage: {
    width: "100%",
    height: 190,
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
    fontSize: 14,
    lineHeight: 22,
    color: "#831843",
    fontWeight: "700",
    marginBottom: 4,
  },

  mainButton: {
    backgroundColor: "#A7F3D0",
    paddingVertical: 20,
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
    fontSize: 21,
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
    fontSize: 18,
    fontWeight: "900",
    color: "#065F46",
    marginBottom: 8,
  },

  summaryText: {
    fontSize: 17,
    lineHeight: 28,
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
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#F3F4F6",
  },

  cardText: {
    fontSize: 17,
    lineHeight: 30,
    color: "#374151",
  },

  actionSection: {
    marginTop: 20,
    gap: 12,
  },

  familyButton: {
    backgroundColor: "#DBEAFE",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
  },

  familyButtonText: {
    color: "#1E3A8A",
    fontSize: 18,
    fontWeight: "900",
  },

  alarmButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
  },

  alarmButtonText: {
    color: "#374151",
    fontSize: 18,
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
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A8A",
    marginBottom: 10,
  },

  familyMessageText: {
    fontSize: 14,
    lineHeight: 23,
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