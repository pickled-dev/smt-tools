import _, { result } from 'lodash'
import { Observable } from 'rxjs'

import {
	ResultsMessage,
	BuildRecipe,
	Fusion,
} from '@shared/types/smt-tools.types'
import { DemonBuilder } from '@shared/types/demon-builder'
import { P5Compendium } from './p5-compendium'
import { P5FusionCalculator } from './p5-fusion-calculator'

import { P5_COMPENDIUM, P5_FUSION_CALCULATOR } from '@shared/constants'

export class P5FusionChaainCalculator extends DemonBuilder {
	declare compendium: P5Compendium
	declare calculator: P5FusionCalculator

	constructor() {
		super(P5_COMPENDIUM, P5_FUSION_CALCULATOR)
	}

	getFusionChains(
		targetSkills: string[],
		demonName?: string
	): Observable<ResultsMessage> {
		/* Begins recursive calls, either with a specified demon or without.*/
		if (demonName) {
			this.getFusionChains_targetSkills_demonName(targetSkills, demonName)
		} else this.getFusionChains_targetSkills(targetSkills)
		/* null data tells listeners the messages are finished, and they can 
			stop listening */
		this.resultMessageSubject.next({
			results: null,
			combo: null,
			error: null,
		})
		return this.resultMessageObservable
	}
	private getFusionChains_targetSkills(targetSkills: string[]): void {
		for (let skillName of targetSkills) {
			let unique = this.compendium.skills[skillName].unique
			if (unique) {
				this.getFusionChains_targetSkills_demonName(
					targetSkills,
					unique
				)
			}
		}
		let chains: BuildRecipe[] = []
		let errors: string[] = []

		/* Loop through every demon in the compendium checking if they are 
			possible fusions and if they have specified skills */
		for (let demonName in this.compendium.demons) {
			this.combo++
			if (chains.length >= this.maxChainLength) return
			let possibility = this.isPossible(targetSkills, demonName)
			if (!possibility.possible) {
				this.resultMessageSubject.next({
					results: null,
					combo: null,
					error: possibility.reason,
				})
				continue
			}
			let newChains: BuildRecipe[] = []
			let demon = this.compendium.demons[demonName]

			//check if the demon has any skills we need
			let intersects = _.intersection(
				targetSkills,
				Object.keys(demon.skills)
			)
			if (intersects.length > 0 || this.deep) {
				this.getFusionChains_targetSkills_demonName(
					targetSkills,
					demonName
				)
			}

			if (newChains.length > 0) chains = chains.concat(newChains)
		}
	}
	private getFusionChains_targetSkills_demonName(
		skills: string[],
		demonName: string
	): void {
		let chains: BuildRecipe[] = []
		let targetSkills = _.cloneDeep(skills)
		let possibility = this.isPossible(targetSkills, demonName)
		if (!possibility.possible) {
			this.resultMessageSubject.next({
				results: null,
				combo: null,
				error: possibility.reason,
			})
			return
		}
		let demon = this.compendium.demons[demonName]
		//filter out skills the demon learns innately
		let innates = _.intersection(targetSkills, Object.keys(demon.skills))
		if (innates.length > 0) {
			if (innates.length == targetSkills.length) return
			let diff = _.difference(targetSkills, innates)
			if (diff.length > 4) return
			_.pullAll(targetSkills, innates)
		}
		let fissions = this.calculator.getFissions(demonName)
		for (let fission of fissions) {
			this.combo++
			if (chains.length >= this.maxChainLength) return
			if (!this.isPossible(targetSkills, undefined, fission)) continue
			let foundSkills = this.checkFusionSkills(targetSkills, fission)
			if (foundSkills.length > 0 || this.deep) {
				for (let sourceName of fission.sources) {
					let diff = _.difference(targetSkills, foundSkills)
					if (diff.length == 0) {
						let chain = this.getEmptyFusionChain()
						this.addStep(chain, fission, foundSkills)
						this.emitFusionChain(chain, innates)
						break
					}
					let chain = this.getFusionChain(diff, 0, sourceName)
					if (chain != null) {
						this.addStep(chain, fission, foundSkills)
						this.emitFusionChain(chain, innates)
					}
				}
			}
		}
	}
	protected getFusionChain(
		targetSkills: string[],
		recursiveDepth: number,
		demonName: string
	): BuildRecipe | null {
		this.combo++
		if (targetSkills.length == 0) {
			throw new Error(
				'getChain was called with an empty targetSkills arg'
			)
		}
		if (recursiveDepth > this.recursiveDepth) return null
		let possibility = this.isPossible(targetSkills, demonName)
		if (!possibility.possible) {
			this.resultMessageSubject.next({
				results: null,
				combo: null,
				error: possibility.reason,
			})
			return null
		}
		let fissions = this.calculator.getFissions(demonName)
		for (let fission of fissions) {
			this.combo++
			let possibility = this.isPossible(targetSkills, undefined, fission)
			if (!possibility.possible) {
				this.resultMessageSubject.next({
					results: null,
					combo: null,
					error: possibility.reason,
				})
				continue
			}
			let foundSkills = this.checkFusionSkills(targetSkills, fission)
			if (foundSkills.length == targetSkills.length) {
				let chain = this.getEmptyFusionChain()
				this.addStep(chain, fission, targetSkills)
				return chain
			}
			if (foundSkills.length > 0 || this.deep) {
				for (let sourceName of fission.sources) {
					let diff = _.difference(targetSkills, foundSkills)
					let chain = this.getFusionChain(
						diff,
						recursiveDepth + 1,
						sourceName
					)
					if (chain != null) {
						this.addStep(chain, fission, foundSkills)
						return chain
					}
				}
			}
		}
		return null
	}
	protected isPossible(
		targetSkills: string[],
		demonName?: string,
		recipe?: Fusion
	): { possible: boolean; reason: string } {
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
	private isPossible_targetSkills(targetSkills: string[]): {
		possible: boolean
		reason: string
	} {
		//check is the skill is unique, if it is, fuse for that demon
		for (let skillName of targetSkills) {
			let skill = this.compendium.skills[skillName]
			if (skill.unique) {
				return this.isPossible_targetSkills_demonName(
					targetSkills,
					skill.unique
				)
			}
		}
		//only 4 skills can be inheritted, if the user requested more,
		// the others will need to be learned either through hangings or innate
		// skills
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
					if (_.intersection(innate, skills).length == numberNeeded) {
						return { possible: true, reason: '' }
					}
			}
			if (targetSkills.length - 4 == 1) {
				return {
					possible: false,
					reason:
						'In Persona 5, a demon can only inherit a maximum of 4 ' +
						'skills. Since you specificed more than that, there must ' +
						'be a demon that can learn at least one' +
						" of the other specificed skills on it's own. Unfortunately, no such demon exists.",
				}
			} else {
				return {
					possible: false,
					reason:
						'In Persona 5, a demon can only inherit a maximum of 4 ' +
						'skills. Since you specificed more than that, there must ' +
						'be a demon that can learn at least ' +
						(targetSkills.length - 4) +
						" of the other specificed skills on it's own. Unfortunately, no such demon exists.",
				}
			}
		}
		return { possible: true, reason: '' }
	}
	private isPossible_targetSkills_recipe(
		targetSkills: string[],
		recipe: Fusion
	): { possible: boolean; reason: string } {
		for (let sourceName of recipe.sources) {
			let possibility = this.isPossible_targetSkills_demonName(
				targetSkills,
				sourceName
			)
			if (!possibility.possible) {
				return possibility
			}
		}
		return { possible: true, reason: '' }
	}
	private isPossible_targetSkills_demonName(
		targetSkills: string[],
		demonName: string
	): { possible: boolean; reason: string } {
		if (this.compendium.demons[demonName].level > this.maxLevel) {
			return {
				possible: false,
				reason: 'The name of the demon you entered has a minimum level greater than the level you specified.',
			}
		}
		if (this.compendium.isElemental(demonName)) {
			return {
				possible: false,
				reason: 'The name of the demon you entered is a treasure demon, and cannot be fused.',
			}
		}
		for (let skillName of targetSkills) {
			let skill = this.compendium.skills[skillName]
			if (skill.unique && skill.unique !== demonName) {
				return {
					possible: false,
					reason:
						'You entered a skill that is unique to ' +
						skill.unique +
						'. But you specified the demon name ' +
						demonName +
						'.',
				}
			}

			if (!this.compendium.isInheritable(demonName, skillName)) {
				return {
					possible: false,
					reason: 'Every Persona has an inheritance type that bars them from learning certain skills. For example persona with inheritance type of Fire cannot inherit Ice skills. You have specified a Persona with an inheritance type that forbids them from learning a skill you have specified.',
				}
			}
			if (this.compendium.getSkillLevel(skillName) > this.maxLevel) {
				return {
					possible: false,
					reason:
						'You have specified a level that is lower than the minimum required level to learn ' +
						skillName +
						'.',
				}
			}
		}
		//maximum number of skills the demon could possibly inherit
		let maxInherit: number
		if (this.compendium.isSpecial(demonName)) {
			let specialRecipe = this.compendium.buildSpecialFusion(demonName)
			maxInherit = this.getMaxNumOfInherittedSkills(specialRecipe)
		} else maxInherit = 4
		//if we need to learn more skills than can be inheritted
		if (targetSkills.length > maxInherit) {
			//number of skills needed to be learned after inheritance
			let numberNeeded: number = targetSkills.length - maxInherit
			//build every combination of skills with length numberNeeded
			let innates = this.getSubArrays(targetSkills)
			for (let i = 0; i < innates.length; i++) {
				if (innates[i].length != numberNeeded) delete innates[i]
			}
			innates = _.compact(innates)
			let skills = Object.keys(this.compendium.demons[demonName].skills)
			for (let innate of innates) {
				if (_.intersection(innate, skills).length == numberNeeded) {
					return { possible: true, reason: '' }
				}
			}
			if (targetSkills.length - 4 == 1) {
				return {
					possible: false,
					reason:
						'In Persona 5, a normal demon can only inherit a maximum of 4 ' +
						'skills (special demons can inherit 5). Since you specificed more than that, ' +
						demonName +
						' at least one of the ' +
						'other specificed skills on their own. Unfortunately, they cannot.',
				}
			} else {
				return {
					possible: false,
					reason:
						'In Persona 5, a normal demon can only inherit a maximum of 4 ' +
						'skills (special demons can inherit 5). Since you specificed more than that, ' +
						demonName +
						' must be able to learn at least ' +
						(targetSkills.length - 4) +
						' of the other specificed skills on their own. Unfortunately, they cannot.',
				}
			}
		}
		return { possible: true, reason: '' }
	}
}
