(function () {
  const supplementalPeople = [
    {
      person_id: "zhang_fangping",
      name: "张方平",
      birth_year: null,
      death_year: null,
      group: "师友前辈",
      role_summary: "北宋官员与文坛前辈，长期赏识并援助苏氏兄弟。",
      relation_to_su_shi: "苏轼的重要前辈和政治、文学支持者，在南都及乌台诗狱营救线中尤其重要。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["bianjing", "xuzhou"],
      source_note: "人物关系依据《苏东坡新传》相关章节行程资料建立；生卒与履历细节待专门人物资料校核。"
    },
    {
      person_id: "fan_zhen",
      name: "范镇",
      birth_year: null,
      death_year: null,
      group: "师友前辈",
      role_summary: "北宋官员、学者，苏轼在汴京的重要前辈友人。",
      relation_to_su_shi: "曾接待苏轼寄居东园，并在乌台诗狱前后参与其交游与援救网络。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["bianjing"],
      source_note: "依据章节行程与事件资料建立的初步人物卡。"
    },
    {
      person_id: "wang_shen",
      name: "王诜",
      birth_year: null,
      death_year: null,
      group: "书画交游",
      role_summary: "北宋宗室姻亲、书画收藏与创作活动中的重要人物。",
      relation_to_su_shi: "与苏轼有宴游、题画和西园雅集等书画文学交往。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["bianjing", "xuzhou"],
      source_note: "依据第四、九章行程资料建立；具体生平与作品关系待进一步校核。"
    },
    {
      person_id: "wang_gong",
      name: "王巩",
      birth_year: null,
      death_year: null,
      group: "患难友人",
      role_summary: "北宋文士，苏轼交游圈中的重要朋友。",
      relation_to_su_shi: "徐州黄楼聚会、乌台诗狱及其后患难交往中的重要人物。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["xuzhou", "bianjing"],
      source_note: "依据第四、五、九章行程资料建立。"
    },
    {
      person_id: "li_chang",
      name: "李常",
      birth_year: null,
      death_year: null,
      group: "地方与馆阁友人",
      role_summary: "北宋官员、学者，与苏轼有长期文学交往。",
      relation_to_su_shi: "济南迎候、徐州来访，并向苏轼介绍黄庭坚诗文。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["xuzhou"],
      source_note: "依据第四章行程资料建立。"
    },
    {
      person_id: "wen_tong",
      name: "文同",
      birth_year: null,
      death_year: 1079,
      group: "亲族与艺术知己",
      role_summary: "北宋画家、诗人，以墨竹闻名。",
      relation_to_su_shi: "苏轼的亲族与艺术知己；其去世给苏轼带来强烈哀痛。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["xuzhou"],
      source_note: "依据第四章悼亡节点建立；具体亲属称谓和生平待人物专档校核。"
    },
    {
      person_id: "yan_fu",
      name: "颜复",
      birth_year: null,
      death_year: null,
      group: "徐州友人",
      role_summary: "苏轼徐州时期交游人物。",
      relation_to_su_shi: "参与百步洪、云龙山等徐州山水与文会活动。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["xuzhou"],
      source_note: "依据第四章行程资料建立。"
    },
    {
      person_id: "zhang_tianji",
      name: "张天骥",
      birth_year: null,
      death_year: null,
      group: "徐州友人",
      role_summary: "徐州时期与苏轼往来的地方友人。",
      relation_to_su_shi: "参与云龙山等徐州山水交游。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["xuzhou"],
      source_note: "依据第四章行程资料建立。"
    },
    {
      person_id: "li_ding",
      name: "李定",
      birth_year: null,
      death_year: null,
      group: "乌台诗狱人物",
      role_summary: "乌台诗狱中参与弹劾和审讯政治过程的人物。",
      relation_to_su_shi: "在文字罗织与政治追究线中与苏轼形成对立关系。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["bianjing"],
      source_note: "依据第五章乌台诗狱资料建立；具体奏章和责任分工待一手材料校核。"
    },
    {
      person_id: "shu_dan",
      name: "舒亶",
      birth_year: null,
      death_year: null,
      group: "乌台诗狱人物",
      role_summary: "乌台诗狱中参与弹劾和诗文检举的人物。",
      relation_to_su_shi: "在诗文被政治化解释的过程中与苏轼形成对立关系。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["bianjing"],
      source_note: "依据第五章乌台诗狱资料建立。"
    },
    {
      person_id: "he_zhengchen",
      name: "何正臣",
      birth_year: null,
      death_year: null,
      group: "乌台诗狱人物",
      role_summary: "乌台诗狱前后参与检举苏轼文字的人物。",
      relation_to_su_shi: "在湖州谢表及诗文追究线中与苏轼形成政治对立。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["huzhou", "bianjing"],
      source_note: "依据第五章乌台诗狱资料建立。"
    },
    {
      person_id: "ma_mengde",
      name: "马梦得",
      birth_year: null,
      death_year: null,
      group: "黄州友人",
      role_summary: "苏轼黄州时期的重要生活支持者。",
      relation_to_su_shi: "帮助取得东坡田地，是“东坡”生活空间形成的重要人物。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["huangzhou"],
      source_note: "依据第六章黄州生活资料建立。"
    },
    {
      person_id: "pan_bing",
      name: "潘丙",
      birth_year: null,
      death_year: null,
      group: "黄州友人",
      role_summary: "苏轼黄州时期交游圈人物。",
      relation_to_su_shi: "参与黄州日常生活和地方交游。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["huangzhou"],
      source_note: "依据第六章资料建立，具体事迹待补。"
    },
    {
      person_id: "guo_gou",
      name: "郭遘",
      birth_year: null,
      death_year: null,
      group: "黄州友人",
      role_summary: "苏轼黄州时期交游圈人物。",
      relation_to_su_shi: "参与黄州日常生活和地方交游。",
      native_place: null,
      native_place_key: null,
      related_place_keys: ["huangzhou"],
      source_note: "依据第六章资料建立，具体事迹待补。"
    }
  ];

  const people = Array.isArray(window.suShiPeople) ? window.suShiPeople : [];
  const knownPersonIds = new Set(people.map((person) => person.person_id));
  window.suShiPeople = people.concat(supplementalPeople.filter((person) => !knownPersonIds.has(person.person_id)));

  window.suShiKnowledgeConfig = {
    schema_version: 1,
    historical_context: {
      available_slice_years: [1080],
      auto_hide_distance_years: 10,
      label: "1080 年 Hartwell/CHGIS 历史区域切片"
    },
    certainty_levels: {
      high: "高可信",
      medium: "中可信",
      low: "待核"
    },
    relation_statuses: {
      curated: "人工明确关联",
      event_seed: "章节事件资料关联",
      text_match: "章节文字匹配",
      derived: "程序派生关联"
    },
    work_text_statuses: {
      local: "本地校录原文",
      external: "外部全文",
      search: "自动检索原文",
      missing: "尚无全文"
    },
    person_aliases: {
      su_shi: ["苏轼", "蘇軾", "东坡", "東坡", "子瞻"],
      su_xun: ["苏洵", "蘇洵", "老泉"],
      su_zhe: ["苏辙", "蘇轍", "子由"],
      wang_fu: ["王弗"],
      wang_runzhi: ["王闰之", "王閏之", "闰之", "閏之"],
      chaoyun: ["朝云", "朝雲"],
      ouyang_xiu: ["欧阳修", "歐陽修", "六一居士"],
      wang_anshi: ["王安石", "介甫", "半山"],
      sima_guang: ["司马光", "司馬光", "君实", "君實"],
      zhang_dun: ["章惇", "子厚"],
      huang_tingjian: ["黄庭坚", "黃庭堅", "鲁直", "魯直"],
      qin_guan: ["秦观", "秦觀", "少游"],
      chao_buzhi: ["晁补之", "晁補之", "无咎", "無咎"],
      zhang_lei: ["张耒", "張耒", "文潜", "文潛"],
      chen_zao: ["陈慥", "陳慥", "季常"],
      foyin: ["佛印", "了元"],
      canliao: ["参寥", "參寥", "道潜", "道潛"],
      zhang_fangping: ["张方平", "張方平"],
      fan_zhen: ["范镇", "范鎮"],
      wang_shen: ["王诜", "王詵"],
      wang_gong: ["王巩", "王鞏"],
      li_chang: ["李常"],
      wen_tong: ["文同", "与可", "與可"],
      yan_fu: ["颜复", "顏復"],
      zhang_tianji: ["张天骥", "張天驥"],
      li_ding: ["李定"],
      shu_dan: ["舒亶"],
      he_zhengchen: ["何正臣"],
      ma_mengde: ["马梦得", "馬夢得"],
      pan_bing: ["潘丙"],
      guo_gou: ["郭遘"]
    },
    curated_chapter_people: {
      nanxing_1059_1060: [
        { person_id: "su_xun", role: "同行与家族主线", certainty: "high" },
        { person_id: "su_zhe", role: "同行与兄弟主线", certainty: "high" }
      ],
      bianfa_1061_1071: [
        { person_id: "su_xun", role: "父丧与归蜀守制", certainty: "high" },
        { person_id: "su_zhe", role: "兄弟仕途与政治讨论", certainty: "high" },
        { person_id: "wang_fu", role: "家庭与丧妻事件", certainty: "high" },
        { person_id: "ouyang_xiu", role: "文坛与政治前辈", certainty: "medium" },
        { person_id: "wang_anshi", role: "变法政治背景", certainty: "high" }
      ],
      maru_1071_1076: [
        { person_id: "wang_runzhi", role: "家庭生活", certainty: "medium" },
        { person_id: "canliao", role: "杭州佛教与诗歌交游", certainty: "medium" }
      ],
      huanglou_1077_1079: [
        { person_id: "su_zhe", role: "兄弟重逢与送别", certainty: "high" },
        { person_id: "zhang_fangping", role: "南都前辈", certainty: "high" },
        { person_id: "fan_zhen", role: "东园寄居", certainty: "high" },
        { person_id: "wang_shen", role: "题画宴游", certainty: "high" },
        { person_id: "wang_gong", role: "黄楼文会", certainty: "high" },
        { person_id: "li_chang", role: "济南与徐州交游", certainty: "high" },
        { person_id: "wen_tong", role: "艺术知己与悼亡", certainty: "high" },
        { person_id: "huang_tingjian", role: "诗文投赠", certainty: "high" },
        { person_id: "qin_guan", role: "苏门后辈来访", certainty: "high" },
        { person_id: "canliao", role: "徐州诗禅交游", certainty: "high" },
        { person_id: "yan_fu", role: "徐州山水交游", certainty: "high" },
        { person_id: "zhang_tianji", role: "徐州山水交游", certainty: "high" }
      ],
      wutai_1079: [
        { person_id: "su_zhe", role: "营救与兄弟关系", certainty: "high" },
        { person_id: "zhang_fangping", role: "营救网络", certainty: "medium" },
        { person_id: "fan_zhen", role: "营救网络", certainty: "medium" },
        { person_id: "li_ding", role: "弹劾与审讯", certainty: "high" },
        { person_id: "shu_dan", role: "诗文检举", certainty: "high" },
        { person_id: "he_zhengchen", role: "湖州谢表检举", certainty: "high" }
      ],
      huangzhou_1080_1084: [
        { person_id: "su_zhe", role: "书信与兄弟支持", certainty: "high" },
        { person_id: "chen_zao", role: "黄州地方友人", certainty: "high" },
        { person_id: "foyin", role: "佛教交游", certainty: "medium" },
        { person_id: "canliao", role: "诗禅交游", certainty: "medium" },
        { person_id: "ma_mengde", role: "东坡田地与生活支持", certainty: "high" },
        { person_id: "pan_bing", role: "黄州交游", certainty: "medium" },
        { person_id: "guo_gou", role: "黄州交游", certainty: "medium" }
      ],
      jianghuai_1084_1085: [
        { person_id: "wang_anshi", role: "金陵相见", certainty: "high" },
        { person_id: "su_zhe", role: "访弟与家族行程", certainty: "high" }
      ],
      jinghua_1085_1089: [
        { person_id: "su_zhe", role: "元祐朝政治与兄弟关系", certainty: "high" },
        { person_id: "sima_guang", role: "元祐政治背景", certainty: "high" }
      ],
      study_circle_1086_1089: [
        { person_id: "su_zhe", role: "家庭与兄弟圈", certainty: "high" },
        { person_id: "huang_tingjian", role: "苏门与书画交游", certainty: "high" },
        { person_id: "qin_guan", role: "苏门交游", certainty: "high" },
        { person_id: "chao_buzhi", role: "苏门交游", certainty: "high" },
        { person_id: "zhang_lei", role: "苏门交游", certainty: "high" },
        { person_id: "wang_shen", role: "西园书画交游", certainty: "high" },
        { person_id: "wang_gong", role: "患难友人", certainty: "high" }
      ],
      hangzhou_return_1089_1091: [
        { person_id: "canliao", role: "杭州诗禅交游", certainty: "medium" }
      ],
      ying_yang_ding_1091_1094: [
        { person_id: "su_zhe", role: "兄弟与朝局", certainty: "medium" },
        { person_id: "wang_runzhi", role: "家庭与丧偶事件", certainty: "high" }
      ],
      huizhou_1094_1097: [
        { person_id: "chaoyun", role: "惠州生活与朝云之死", certainty: "high" },
        { person_id: "zhang_dun", role: "绍圣贬谪政治背景", certainty: "high" },
        { person_id: "su_zhe", role: "兄弟书信与贬谪背景", certainty: "medium" }
      ],
      hainan_1097_1100: [
        { person_id: "zhang_dun", role: "海外贬谪政治背景", certainty: "high" }
      ],
      beigui_1100_1102: [
        { person_id: "su_zhe", role: "北归后的兄弟与安葬安排", certainty: "high" },
        { person_id: "qin_guan", role: "北归途中闻丧", certainty: "high" }
      ]
    }
  };
})();