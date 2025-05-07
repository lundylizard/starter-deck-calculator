# 🃏 Deck Probability Simulator

Estimate the chance your randomly generated 40-card Yu-Gi-Oh! Forbidden Memories deck meets your specified card or card-type requirements via Monte Carlo simulation.

## 🚀 **Usage**  
1. Click **+ Add Requirement** to start defining what your deck should contain.  
2. For each requirement group:  
   - Choose **Card** or **Type**.  
   - Enter one or more alternatives (e.g. “Dark Hole” or select “equip”).  
   - Set **Min** and **Max** counts.  
3. Adjust **Trials** if desired (more trials → more accurate, but slower).  
4. Click **Run Simulation**.  
5. View the probability summary and copy or bookmark results as needed.  

## ✨ **Features**  
- 🎯 **Custom Requirements**  
  - Require exact counts or ranges (min/max) of specific cards (e.g. “2 Dark Hole”)  
  - Require counts or ranges of whole card types (e.g. “at least 3 Spellcaster-type monsters”)  
  - Support for OR-groups (e.g. “Raigeki or Dark Hole”)  
- 🔄 **Monte Carlo Sampling**  
  - Configurable number of trials (default: 1 000 000)  
  - Automatic forced inclusion of at least one Magic card, one Equip card, and one of a default pair (Raigeki/Dark Hole) if none were sampled  
- 💾 **Persistence**  
  - Requirements are saved in a cookie so you don’t lose your list when you reload the page  
- 📈 **Summary Report**  
  - Displays a human-readable list of your requirements and the calculated probability (as percentage and “1 in X” odds)

## 📊 **Data Source**  
Card drop rates and metadata are derived from here:  
> **GenericMadScientist/FM-Manip-Tool**  
> https://github.com/GenericMadScientist/FM-Manip-Tool/blob/master/data/FmDatabase.db  
>  
> Only the necessary fields (`card_id`, `name`, `type`, `cdf` drop-rate) were extracted into `assets/cards_data.json`.

## 📄 **License**  
This project is licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0).  
Feel free to use, modify, and share, provided you give appropriate credit.  
