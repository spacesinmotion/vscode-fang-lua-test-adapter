local fakeTestSuite = {
    type = 'suite',
    id = 'root',
    label = 'LuaTesting',
    children = {
        {
            type = 'suite',
            id = 'nested',
            label = 'Suite alla 1',
            children = {
                {
                    type = 'suite',
                    id = 'nested_nested',
                    label = 'inner Suite',
                    children = {
                        {
                            type = 'test',
                            id = 'test1',
                            label = 'Test #1'
                        },
                        {
                            type = 'test',
                            id = 'xtest2',
                            label = 'Test f#2'
                        },
                        {
                            type = 'test',
                            id = 'asdasd',
                            label = 'Some stuff'
                        }
                    }
                },
                {
                    type = 'test',
                    id = 'xtest1',
                    label = 'Regression 1'
                },
                {
                    type = 'test',
                    id = 'test2',
                    label = 'Feature 2'
                }
            }
        },
        {
            type = 'test',
            id = 'id_passed',
            label = 'Passed test'
        },
        {
            type = 'test',
            id = 'id_failed',
            label = 'Failed test'
        },
        {
            type = 'test',
            id = 'id_skipped',
            label = 'Skipped test'
        },
        {
            type = 'test',
            id = 'id_errored',
            label = 'Errored test'
        }
    }
}

local json = require "json"

local function json_out(t)
    print(json.encode(t))
end

local function wait(msec)
    local t = os.clock()
    repeat
        until os.clock() > t + msec * 1e-3
end

local function run_test(suite)
    json_out{type = 'test', test = suite.id, state = 'running'}
    wait(math.random(500, 1500))
    if suite.id == 'id_failed' then
        json_out{type = 'test', test = suite.id, state = 'failed'}
    elseif suite.id == 'id_errored' then
        json_out{type = 'test', test = suite.id, state = 'errored'}
    elseif suite.id == 'id_skipped' then
        json_out{type = 'test', test = suite.id, state = 'skipped'}
    else
        json_out{type = 'test', test = suite.id, state = 'passed'}
    end
end

local function run_all(suite)
    if suite.type == 'suite' then
        json_out{type = 'suite', suite = suite.id, state = 'running'}
        for _, c in ipairs(suite.children) do
            run_all(c)
        end
        json_out{type = 'suite', suite = suite.id, state = 'completed'}
    elseif suite.type == 'test' then
        run_test(suite)
    end
end

local function run_selected(suite, selection)
    if suite.type == 'suite' then
        if selection[suite.id] then
            run_all(suite)
        else
            for _, c in ipairs(suite.children) do
                run_selected(c, selection)
            end
        end
    elseif suite.type == 'test' and selection[suite.id] then
        run_test(suite)
    end
end

if arg[1] == 'suite' then
    print(json.encode(fakeTestSuite))
elseif arg[1] == 'run' then
    if #arg == 1 then
        run_all(fakeTestSuite)
    else
        local as_set = {}
        for i = 2, #arg do
            as_set[arg[i]] = true
        end
        run_selected(fakeTestSuite, as_set)
    end
end
