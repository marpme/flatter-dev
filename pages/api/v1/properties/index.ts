import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import { Database } from '../../../../types/supabase'
import Property, {
    PropertyFilterOption,
    PropertySortOption,
} from '../../../../types/Property'

type PropertiesHandler = {
    sort: PropertySortOption
    filter: PropertyFilterOption
}

const sortFunctions: {
    [key in PropertySortOption]: (
        propertyA: Property,
        propertyB: Property
    ) => number
} = {
    inserted: (propertyA, propertyB) =>
        new Date(propertyA.created_at!).getTime() -
        new Date(propertyB.created_at!).getTime(),
    price: (propertyA, propertyB) => propertyA.price - propertyB.price,
    sqmeter: (propertyA, propertyB) => propertyB.sqmeter - propertyA.sqmeter,
}

const parseQuery = (req: NextApiRequest): PropertiesHandler => {
    const { priceMax, priceMin, wbs, sort } = req.query

    return {
        sort: sort as PropertySortOption,
        filter: {
            price: {
                min: parseInt(String(priceMin), 10),
                max: parseInt(String(priceMax), 10),
            },
            wbs: Boolean(wbs),
        },
    }
}

const propertiesHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
        return res
            .status(400)
            .setHeader('Cache-Control', 'public, max-age=300')
            .json({})
    }

    const { filter, sort } = parseQuery(req)
    const supabase = createServerSupabaseClient<Database>({ req, res })

    const propertyLoader = supabase
        .from('properties')
        .select('*')
        .eq('deleted', 'false')
        .gte('price', filter.price.min)
        .lte('price', filter.price.max)

    // if wbs is disabled, just load non-wbs properties
    // otherwise, we just load all!
    if (!filter.wbs) {
        propertyLoader.eq('wbs', false)
    }

    const { data: properties, error } = await propertyLoader
    if (error || !properties) {
        return res.status(500).json({ message: 'error loading properties' })
    }

    const sortFunction = sortFunctions[sort]
    const sortedProperties = (properties as Property[]).sort(sortFunction)

    return res
        .status(200)
        .setHeader('Cache-Control', 'public, max-age=300')
        .json(sortedProperties)
}

export default propertiesHandler
