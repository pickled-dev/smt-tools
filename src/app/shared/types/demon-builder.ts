import { Compendium } from './compendium'
import { FusionCalculator } from './fusion-calculator'
import _ from 'lodash'
import { Observable, Subject } from 'rxjs'
import { BuildRecipe, Fusion, InputChainData } from './smt-tools.types'
import { DoWorkUnit } from 'observable-webworker'

export abstract class DemonBuilder
	implements DoWorkUnit<InputChainData, BuildRecipe>
{
	protected compendium: Compendium
	protected calculator: FusionCalculator

	maxLevel = 99
	/* the depth the builder will go to checking for skills even if immediate 
		sources don't have desired skills */
	recurDepth = 1
	// the max size array getChains can return
	maxChainLength = 20

	constructor(compendium: Compendium, calculator: FusionCalculator) {
		this.compendium = compendium
		this.calculator = calculator
	}
	/**
	 * TypeScript will get mad if I don't keep this here, even though it is
	 * completely unnecessary for my setup.
	 */
	work(
		input: InputChainData
	): Observable<BuildRecipe> | PromiseLike<BuildRecipe> {
		throw new Error('Method not implemented.')
	}

	/**
	 * The code to be run on the web worker. Will emit a BuildRecipe whenever it
	 * successfuly calculates one.
	 *
	 * @param input$ On obsvervable stream of InputChainData containing the user
	 *   specified configations for the calculation
	 * @returns On observable stream of BuildRecipes
	 */
	abstract workUnit(input: InputChainData): Observable<BuildRecipe>

	/**
	 * Attempts to create as many fusion chains as possible that match the given
	 * parameters. If it finds the fusion is impossible, it should emit and
	 * FusionChain with an error explaining why. If it finds possible fusions,
	 * it should emit them to the observable as it calculates them
	 *
	 * @param targetSkills: A list of skills for the final demon
	 * @param demonName: The name of the demon to fuse to
	 * @returns A stream of messages updated whenever a chain is added to
	 *   this.chains configured by ChainCalculator's properties
	 */
	protected abstract getFusionChains(
		input: InputChainData
	): Observable<BuildRecipe>

	/**
	 * Checks for any immediately obvious reasons that building the specified
	 * demon is impossible. Emit feedback to the DOM explaining why it is
	 * impossible.
	 *
	 * @param targetSkills Skills specified by user
	 * @param demonName Name of demon specified by user
	 * @returns False if input is invalid. Also emits and error to the
	 *   webworker, telling it to stop
	 */
	protected abstract isValidInput(
		targetSkills: string[],
		demonName?: string
	): boolean

	/**
	 * Attempts to create a single fusion chain that results in the specified
	 * demon with the specified skills.
	 *
	 * @param targetSkills: List of skills for the final demon to inherit
	 * @param recursiveDepth: An incremental number to keep track of the number
	 *   of times the function has called itself. should be 0 unless the
	 *   function is calling itself
	 * @param demonName: Name of the demon to fuse to
	 * @returns A single chain of fusions that result in specified demon and
	 *   skills
	 */
	protected abstract getFusionChain(
		targetSkills: string[],
		recursiveDepth: number,
		demonName: string
	): BuildRecipe | null

	/**
	 * Throws error if both a demonName and a recipe are provided.
	 *
	 * If a demon name is provided: determines if the passed demon is capable of
	 * learning the skills passed.
	 *
	 * If neither are provided checks to see if the specified skills are
	 * possible for ANY demon.
	 *
	 * @param skills: A list of skills to check if possible to inherit
	 * @param demonName: A demon to check if they can inherit the skills
	 * @param fusion: A recipe to check if either source is incapable of
	 *   inheritting. True if sourceA || sourceB can, false otherwise
	 * @returns {possible: boolean, reason: string} If possible, reason is
	 *   always null, if not possible, reason should contain feedback for user
	 *   as to why this fusion is impossible.
	 */
	protected abstract isPossible(
		skills: string[],
		demonName?: string,
		fusion?: Fusion
	): boolean

	/**
	 * Determines if the sources in the given fusion are valid for a fusion
	 * chain
	 *
	 * @param skills Skills fusion will need to be able to inherit
	 * @param fusion Fusion to validate
	 * @returns True if all sources can inherit and are within level range
	 */
	protected validSources(targetSkills: string[], fusion: Fusion): boolean {
		for (let sourceName of fusion.sources) {
			if (this.compendium.demons[sourceName].level > this.maxLevel) {
				return false
			}
		}
		if (!this.canSourcesInherit(targetSkills, fusion)) return false
		return true
	}

	/**
	 * Determines if the sources are capable of inheritting the specified
	 * skills.
	 *
	 * @param skills Skills to check for
	 * @param fusion Fusion to check sources of
	 * @returns True if all skills can be inheritted across all sources
	 */
	private canSourcesInherit(targetSkills: string[], fusion: Fusion): boolean {
		for (let sourceName of fusion.sources) {
			if (this.isPossible(targetSkills, sourceName)) return true
		}
		return false
	}

	/**
	 * Gets the maximum number of a skills a demon can inherit in a given
	 * recipe.
	 *
	 * @param recipe: Recipe to be checked
	 * @returns The total number of skills the demon in the recipes result can
	 *   inherit from its sources
	 */
	protected getMaxNumOfInherittedSkills(recipe: Fusion): number {
		if (recipe.sources.length == 2) return 4
		if (recipe.sources.length >= 4) return 6
		return 5
	}

	/**
	 * Returns every combination of subarrays from the passed array
	 *
	 * @param arr
	 * @returns
	 */
	protected getSubArrays(arr: string[]): string[][] {
		if (arr === undefined)
			throw new Error('getSubArrays called with undefined argument')
		if (arr.length === 1) return [arr]
		else {
			let subarr = this.getSubArrays(arr.slice(1))
			return subarr.concat(
				subarr.map((e) => e.concat(arr[0])),
				[[arr[0]]]
			)
		}
	}

	/**
	 * False if none of the sources in the recipe exceed this.maxLevel, true
	 * otherwise
	 *
	 * @param recipe
	 * @returns
	 */
	protected exceedsMaxLevel(recipe: Fusion): boolean {
		for (let sourceName of recipe.sources)
			if (this.compendium.demons[sourceName].level > this.maxLevel)
				return true
		return false
	}

	/**
	 * Checks the sources of a given recipe for the skills specified
	 *
	 * @param targetSkills Skills to look for
	 * @param recipe Recipe to look in
	 * @returns List of skills in both @param targetSkills and sources of @param
	 *   recipe
	 */
	protected checkFusionSkills(
		targetSkills: string[],
		recipe: Fusion
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

	/** @returns A chain with with default initialized values */
	protected getEmptyFusionChain(): BuildRecipe {
		return {
			fusions: [],
			cost: 0,
			inherittedSkills: [],
			innates: [],
			level: 0,
			result: '',
			directions: [],
		}
	}

	/**
	 * Builds the cost, level, and inherittedSkills array for the given chain
	 * and adds the information to the given chain
	 *
	 * @param skills Target skills to be inherritted on the resultant demon
	 * @param innates Target skills the resulatant demon will learn
	 * @param chain FusionChain to emit and build the recipe steps around
	 */
	protected addChainMetadata(
		chain: BuildRecipe,
		innates: string[]
	): BuildRecipe {
		chain.cost = this.getCost(chain)
		chain.level = this.levelRequired(chain)
		// create list that tells the user what skills should be inheritted at each step
		chain.innates = innates
		chain.result = chain.fusions[chain.fusions.length - 1].result
		if (chain.fusions.length > 1) {
			for (let i = 1; i < chain.fusions.length; i++) {
				chain.inherittedSkills[i] = chain.inherittedSkills[i].concat(
					chain.inherittedSkills[i - 1]
				)
			}
		}
		chain.directions = this.getDirections(chain)
		return chain
	}

	/**
	 * Adds a step to the recipe by pushing the step too the recipe object and
	 * adding the skills to inherit in that step to the inherrittedSkills array
	 *
	 * @param chain: The chain to add the steps to
	 * @param recipe: The recipe to add the steps to
	 * @param inherittedSkills: The array of skills to inherit in that step
	 */
	protected addStep(
		chain: BuildRecipe,
		recipe: Fusion,
		inherittedSkills: string[]
	) {
		chain.fusions.push(recipe)
		chain.inherittedSkills.push(inherittedSkills)
	}

	/**
	 * Gets the estimated cost of the fusion chain
	 *
	 * @param chain: The fusion chain to estimate the cost for
	 * @returns Number: the estimated cost
	 */
	protected getCost(chain: BuildRecipe): number {
		let cost: number = 0
		for (let step of chain.fusions) cost += step.cost!
		return cost
	}

	/**
	 * Generates a string to be shown in the html instructing the user how to
	 * fuse the desired demon
	 *
	 * @param chain: The chain to get instructions for
	 * @returns String[]: an array of lines to be displayed in the html
	 */
	protected getDirections(chain: BuildRecipe): string[] {
		let directions: string[] = []
		for (let i = 0; i < chain.fusions.length; i++) {
			let step = chain.fusions[i]
			let direction = `Step ${i + 1}: `
			if (step.sources.length > 2) {
				direction += `Use the Special Recipe to fuse ${step.result}.`
				direction += ` Have ${step.result} inherit `
			} else {
				direction +=
					`Fuse ${step.sources[0]} with ${step.sources[1]} to make ` +
					`${step.result}. Have ${step.result} inherit `
			}
			let skills = chain.inherittedSkills[i]
			for (let j = 0; j <= skills.length; j++) {
				if (skills.length === 1) {
					direction += `${skills[j]}.`
					break
				}
				if (j === skills.length - 1) {
					direction += `and ${skills[j]}.`
					break
				}
				direction += `${skills[j]}, `
			}
			directions.push(direction)
		}
		if (chain.innates.length < 1) return directions
		let direction = ` ${chain.result} will learn `
		for (let j = 0; j <= chain.innates.length; j++) {
			if (chain.innates.length === 1) {
				direction += `${chain.innates[j]}`
				break
			}
			if (j === chain.innates.length - 1) {
				direction += ` and ${chain.innates[j]}`
				break
			}
			direction += `${chain.innates[j]}, `
		}
		direction += ` on their own.`
		directions.push(direction)
		return directions
	}

	/**
	 * Returns the level of the highest level demon in the provided chain.
	 *
	 * @param chain FusionChain to be evaluated
	 * @returns The largest level in the chain
	 */
	levelRequired(chain: BuildRecipe): number {
		let level = 0
		for (let recipe of chain.fusions) {
			for (let demonName of recipe.sources)
				if (this.compendium.demons[demonName].level > level)
					level = this.compendium.demons[demonName].level
			if (this.compendium.demons[recipe.result].level > level)
				level = this.compendium.demons[recipe.result].level
		}
		return level
	}
}
