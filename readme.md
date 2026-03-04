# 6D-VHQ: Six-Dimensional Visual Hallucination Questionnaire

This repository contains materials related to the **Six-Dimensional Visual Hallucination Questionnaire (6D-VHQ)**, a brief instrument designed to quantify the perceptual contents of visual hallucinations. The questionnaire measures six dimensions of visual phenomenology: geometric content, semantic content, detail level, vividness, entropy, and focality.

The instrument is introduced and validated in:

**Hewitt, T., Seth, A. K., & Schwartzman, D. J. (2026).**  
*Measuring the contents of visual hallucinations induced by psychedelics and stroboscopic light: The Six-Dimensional Visual Hallucination Questionnaire (6D-VHQ).*  
https://doi.org/10.31234/osf.io/qv5hz_v1

Please use these tools with a CC BY-NC licence, giving credit by citing the paper above.
https://creativecommons.org/licenses/by-nc/4.0/deed.en

This repo is also available on the OSF: 
https://osf.io/2np9g/overview?view_only=812947131ed34071b16d05d90706c9fc


---

# Repository structure
- analysis_notebooks/
- demo_webpages/
- imgs/
- question_keys/
- tables_data/


## analysis_notebooks

Jupyter notebooks used to generate the analyses and figures reported in the paper.

- **01_face_validity.ipynb**  
  Analysis of **Experiment 1** (image stimuli) assessing face validity of the questionnaire. Produces results corresponding to **Figure 2**.

- **02_internal_validity.ipynb**  
  Internal consistency and psychometric analysis of the 6D-VHQ across datasets (Cronbach’s α and related statistics). Contributes to **Table 2** and pooled validation analyses.

- **03_multiquestionnaire_validity.ipynb**  
  Convergent validity analysis comparing the **6D-VHQ** with the **11D-ASC** questionnaire.

- **04_imagery_validity.ipynb**  
  Analysis of relationships between 6D-VHQ responses and participant traits (imagery ability and metaphysical beliefs) reported in **Experiment 3**.

- **05_experiment2_analysis.ipynb**  
  Primary analyses for **Experiment 2** (stroboscopically induced visual hallucinations), including frequency-dependent effects. Generates **Figure 3**.

- **06_experiment3_analysis.ipynb**  
  Analyses for **Experiment 3** (psychedelic closed-eye visuals), including comparisons across substances and with the **11D-ASC**. Generates **Figure 4**.

- **07_cross_experiment_analysis.ipynb**  
  Pooled analyses comparing hallucination types across experiments. Generates **Figure 6** and cross-context comparisons.

---

## demo_webpages

Example webpages for administering the **6D-VHQ** in browser-based experiments.

index.html generates a link that launches the questionnaire configured via URL parameters. This allows the questionnaire to be embedded in experiments and responses to be saved locally (e.g., as `.tsv` files with participant identifiers).

---

## imgs

Image stimuli used in **Experiments 1 and 2** for image-based validation of the questionnaire.

---

## question_keys

Spreadsheets listing questionnaire items and their corresponding dimensions. These are used to define scoring and dimensional aggregation.

---

## tables_data

Anonymised data tables used in the analyses.

- **Experiment 1** – image-based validation study  
- **Experiment 2** – stroboscopically induced visual hallucinations  
- **Experiment 3** – psychedelic closed-eye visuals