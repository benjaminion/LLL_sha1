BASE = sha1

SRC_LLL := $(BASE).lll
SRC_SOL := $(BASE).sol

EVM := $(SRC_LLL:%.lll=%_lll.hex) $(SRC_LLL:%.lll=%_lll_opt.hex) \
       $(SRC_SOL:%.sol=%_sol.hex) $(SRC_SOL:%.sol=%_sol_opt.hex)

LLLC := lllc
SOLC := solc --bin

%_lll.hex : %.lll
	$(LLLC) $< > $@

%_lll_opt.hex : %.lll
	$(LLLC) -o $< > $@

%_sol.hex : %.sol
	$(SOLC) $< | sed -n '4p' > $@

%_sol_opt.hex : %.sol
	$(SOLC) --optimize $< | sed -n '4p' > $@

all: $(EVM)

clean:
	rm -f $(EVM)
