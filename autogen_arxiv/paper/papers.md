## Seeking Neural Nuggets: Knowledge Transfer in Large Language Models from a Parametric Perspective

**Authors:** Ming Zhong, Chenxin An, Weizhu Chen, Jiawei Han, Pengcheng He

Large Language Models (LLMs) inherently encode a wealth of knowledge within
their parameters through pre-training on extensive corpora. While prior
research has delved into operations on these parameters to manipulate the
underlying implicit knowledge (encompassing detection, editing, and merging),
there remains an ambiguous understanding regarding their transferability across
models with varying scales. In this paper, we seek to empirically investigate
knowledge transfer from larger to smaller models through a parametric
perspective. To achieve this, we employ sensitivity-based techniques to extract
and align knowledge-specific parameters between different LLMs. Moreover, the
LoRA module is used as the intermediary mechanism for injecting the extracted
knowledge into smaller models. Evaluations across four benchmarks validate the
efficacy of our proposed method. Our findings highlight the critical factors
contributing to the process of parametric knowledge transfer, underscoring the
transferability of model parameters across LLMs of different scales. We release
code and data at \url{https://github.com/maszhongming/ParaKnowTransfer}.

[Read more](http://arxiv.org/abs/2310.11451v1)

## EvalCrafter: Benchmarking and Evaluating Large Video Generation Models

**Authors:** Yaofang Liu, Xiaodong Cun, Xuebo Liu, Xintao Wang, Yong Zhang, Haoxin Chen, Yang Liu, Tieyong Zeng, Raymond Chan, Ying Shan

The vision and language generative models have been overgrown in recent
years. For video generation, various open-sourced models and public-available
services are released for generating high-visual quality videos. However, these
methods often use a few academic metrics, for example, FVD or IS, to evaluate
the performance. We argue that it is hard to judge the large conditional
generative models from the simple metrics since these models are often trained
on very large datasets with multi-aspect abilities. Thus, we propose a new
framework and pipeline to exhaustively evaluate the performance of the
generated videos. To achieve this, we first conduct a new prompt list for
text-to-video generation by analyzing the real-world prompt list with the help
of the large language model. Then, we evaluate the state-of-the-art video
generative models on our carefully designed benchmarks, in terms of visual
qualities, content qualities, motion qualities, and text-caption alignment with
around 18 objective metrics. To obtain the final leaderboard of the models, we
also fit a series of coefficients to align the objective metrics to the users'
opinions. Based on the proposed opinion alignment method, our final score shows
a higher correlation than simply averaging the metrics, showing the
effectiveness of the proposed evaluation method.

[Read more](http://arxiv.org/abs/2310.11440v1)

## Identifying Interpretable Visual Features in Artificial and Biological Neural Systems

**Authors:** David Klindt, Sophia Sanborn, Francisco Acosta, Frédéric Poitevin, Nina Miolane

Single neurons in neural networks are often ``interpretable'' in that they
represent individual, intuitively meaningful features. However, many neurons
exhibit $\textit{mixed selectivity}$, i.e., they represent multiple unrelated
features. A recent hypothesis proposes that features in deep networks may be
represented in $\textit{superposition}$, i.e., on non-orthogonal axes by
multiple neurons, since the number of possible interpretable features in
natural data is generally larger than the number of neurons in a given network.
Accordingly, we should be able to find meaningful directions in activation
space that are not aligned with individual neurons. Here, we propose (1) an
automated method for quantifying visual interpretability that is validated
against a large database of human psychophysics judgments of neuron
interpretability, and (2) an approach for finding meaningful directions in
network activation space. We leverage these methods to discover directions in
convolutional neural networks that are more intuitively meaningful than
individual neurons, as we confirm and investigate in a series of analyses.
Moreover, we apply the same method to two recent datasets of visual neural
responses in the brain and find that our conclusions largely transfer to real
neural data, suggesting that superposition might be deployed by the brain. This
also provides a link with disentanglement and raises fundamental questions
about robust, efficient and factorized representations in both artificial and
biological neural systems.

[Read more](http://arxiv.org/abs/2310.11431v1)

