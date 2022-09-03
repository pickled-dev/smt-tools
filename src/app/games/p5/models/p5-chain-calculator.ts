import { P5_COMPENDIUM, P5_FUSION_CALCULATOR } from '@shared/constants'
import { ChainCalculator, FusionChain } from '@shared/models/chain-calculator'
import { P5Compendium } from './p5-compendium'
import { P5FusionCalculator } from './p5-fusion-calculator'
import _ from 'lodash'
import { Recipe } from '@shared/models/compendium'

export class P5ChainCalculator extends ChainCalculator {
	compendium!: P5Compendium
	calculator!: P5FusionCalculator

	constructor() {
		super(P5_COMPENDIUM, P5_FUSION_CALCULATOR)
	}

	getChains(
		targetSkills: string[],
		deep: boolean,
		demonName?: string
	): FusionChain[] | null {
		let chains: FusionChain[] | null
		if (demonName) {
			chains = this.getChains_targetSkills_demonName(
				targetSkills,
				demonName,
				deep
			)
		} else chains = this.getChains_targetSkills(targetSkills, deep)
		return chains
	}
	private getChains_targetSkills(
		targetSkills: string[],
		deep: boolean
	): FusionChain[] | null {
		for (let skillName of targetSkills) {
			let unique = this.compendium.skills[skillName].unique
			if (unique) {
				let skills = _.difference(targetSkills, [skillName])
				return this.getChains_targetSkills_demonName(
					skills,
					unique,
					deep
				)
			}
		}
		let chains: FusionChain[] = []
		for (let demonName in this.compendium.demons) {
			if (chains.length >= this.maxChainLength) {
				console.log('Chain number Reached')
				return chains
			}
			if (!this.isPossible(targetSkills, demonName)) continue
			let newChains = this.getChains_targetSkills_demonName(
				targetSkills,
				demonName,
				deep
			)
			if (newChains !== null) chains = chains.concat(newChains)
		}
		if (chains.length > 0) return chains
		return null
	}
	private getChains_targetSkills_demonName(
		skills: string[],
		demonName: string,
		deep: boolean
	): FusionChain[] | null {
		let targetSkills = _.cloneDeep(skills)
		if (!this.isPossible(targetSkills, demonName)) return null
		let demon = this.compendium.demons[demonName]
		let innates = _.intersection(targetSkills, Object.keys(demon.skills))
		if (innates.length > 0) {
			//TODO if a demon knows all innate skills null is returned
			if (innates.length == targetSkills.length) return null
			let diff = _.difference(targetSkills, innates)
			if (diff.length > 4) return null
			_.pullAll(targetSkills, innates)
		}
		let chains: FusionChain[] = []
		let fissions = this.calculator.getFissions(demonName)
		for (let fission of fissions) {
			if (chains.length >= this.maxChainLength) {
				console.log('Chain number reached')
				return chains
			}
			if (!this.isPossible(targetSkills, undefined, fission)) continue
			let foundSkills = this.checkRecipeSkills(targetSkills, fission)
			if (foundSkills.length > 0 || deep) {
				for (let sourceName of fission.sources) {
					let diff = _.difference(targetSkills, foundSkills)
					if (diff.length == 0) {
						this.addChain(fission, foundSkills, innates, chains)
						continue
					}
					let chain = this.getChain(diff, 0, sourceName, deep)
					if (chain != null) {
						this.addChain(
							fission,
							foundSkills,
							innates,
							chains,
							chain
						)
					}
				}
			}
		}
		if (chains.length > 0) return chains
		return null
	}

	protected getChain(
		targetSkills: string[],
		recursiveDepth: number,
		demonName: string,
		deep: boolean
	): FusionChain | null {
		if (targetSkills.length == 0) {
			throw new Error(
				'getChain was called with an empty targetSkills arg'
			)
		}
		if (recursiveDepth > this.recursiveDepth) {
			console.log('Recursive depth reached')
			return null
		}
		if (this.compendium.isElemental(demonName)) return null
		if (!this.isPossible(targetSkills, demonName)) return null
		let fissions = this.calculator.getFissions(demonName)
		for (let fission of fissions) {
			if (!this.isPossible(targetSkills, undefined, fission)) continue
			let foundSkills = this.checkRecipeSkills(targetSkills, fission)
			if (foundSkills.length == targetSkills.length) {
				let chain: FusionChain = new FusionChain()
				chain.addStep(fission, targetSkills)
				return chain
			}
			if (foundSkills.length > 0 || deep) {
				for (let sourceName of fission.sources) {
					let diff = _.difference(targetSkills, foundSkills)
					let chain = this.getChain(
						diff,
						recursiveDepth + 1,
						sourceName,
						deep
					)
					if (chain != null) {
						chain.addStep(fission, foundSkills)
						return chain
					}
				}
			}
		}
		return null
	}

	/* @returns: returns a list of skils that intersects @param targetSkills
		and all the skills in @param recipe sources */
	private checkRecipeSkills(
		targetSkills: string[],
		recipe: Recipe
	): string[] {
		let foundSkills: string[] = []
		for (let sourceName of recipe.sources) {
			let intersects = _.intersection(
				targetSkills,
				Object.keys(this.compendium.demons[sourceName].skills)
			)
			if (intersects.length > 0) {
				foundSkills = foundSkills.concat(intersects)
				foundSkills = _.uniq(foundSkills)
			}
		}
		return foundSkills
	}

	/* formats/creates a chain and adds the information from @param reicpe and @param skills
	and adds it to the @param fusionChain */
	private addChain(
		recipe: Recipe,
		skills: string[],
		innates: string[],
		chains: FusionChain[],
		chain?: FusionChain
	): void {
		if (!chain) chain = new FusionChain()
		chain.addStep(recipe, skills)
		chain.cost = chain.getCost()
		chain.level = this.levelRequired(chain)
		chain.innates = innates
		chain.result = chain.steps[chain.steps.length - 1].result
		if (chain.steps.length > 1) {
			for (let i = 1; i < chain.steps.length; i++) {
				chain.inherittedSkills[i] = chain.inherittedSkills[i].concat(
					chain.inherittedSkills[i - 1]
				)
			}
		}
		chains.push(chain)
	}

	protected isPossible(
		targetSkills: string[],
		demonName?: string,
		recipe?: Recipe
	): boolean {
		if (recipe !== undefined && demonName !== undefined) {
			throw new Error(
				'isPossible() cannot accept both a demon ' + 'name and a recipe'
			)
		}
		if (recipe) {
			return this.isPossible_targetSkills_recipe(targetSkills, recipe)
		}
		if (demonName) {
			return this.isPossible_targetSkills_demonName(
				targetSkills,
				demonName
			)
		}
		return this.isPossible_targetSkills(targetSkills)
	}
	private isPossible_targetSkills(targetSkills: string[]): boolean {
		//check the demon necessary for a given unique skill
		for (let skillName of targetSkills) {
			let skill = this.compendium.skills[skillName]
			if (skill.unique) {
				return this.isPossible_targetSkills_demonName(
					targetSkills,
					skill.unique
				)
			}
		}
		//only 4 skills can be inheritted, the others will need to be learned
		// either through hangings or innate skills
		if (targetSkills.length > 4) {
			let numberNeeded: number = targetSkills.length - 4
			//build every combination of skills with length numberNeeded
			let innates = this.getSubArrays(targetSkills)
			for (let i = 0; i < innates.length; i++)
				if (innates[i].length != numberNeeded) delete innates[i]
			innates = _.compact(innates)
			//see if there are any demons with innates skills as such
			for (let name in this.compendium.demons) {
				let skills = Object.keys(this.compendium.demons[name].skills)
				for (let innate of innates)
					if (_.intersection(innate, skills).length == numberNeeded)
						return true
			}
			return false
		}
		return true
	}
	private isPossible_targetSkills_recipe(
		targetSkills: string[],
		recipe: Recipe
	): boolean {
		for (let sourceName of recipe.sources) {
			if (
				!this.isPossible_targetSkills_demonName(
					targetSkills,
					sourceName
				)
			)
				return false
		}
		return true
	}
	private isPossible_targetSkills_demonName(
		targetSkills: string[],
		demonName: string
	): boolean {
		if (this.compendium.demons[demonName].lvl > this.maxLevel) return false
		for (let skillName of targetSkills) {
			let skill = this.compendium.skills[skillName]
			if (skill.unique && skill.unique !== demonName) return false
			if (!this.compendium.isInheritable(demonName, skillName)) {
				return false
			}
			if (this.compendium.getSkillLevel(skillName) > this.maxLevel) {
				return false
			}
		}
		let inheritNum: number
		if (this.compendium.isSpecial(demonName)) {
			let specialRecipe = this.compendium.buildSpecialRecipe(demonName)
			inheritNum = this.getMaxNumOfInherittedSkills(specialRecipe)
		} else inheritNum = 4
		if (targetSkills.length > inheritNum) {
			let numberNeeded: number = targetSkills.length - inheritNum
			//build every combination of skills with length numberNeeded
			let innates = this.getSubArrays(targetSkills)
			for (let i = 0; i < innates.length; i++) {
				if (innates[i].length != numberNeeded) delete innates[i]
			}
			innates = _.compact(innates)
			let skills = Object.keys(this.compendium.demons[demonName].skills)
			for (let innate of innates) {
				if (_.intersection(innate, skills).length == numberNeeded) {
					return true
				}
			}
			return false
		}
		return true
	}
}
